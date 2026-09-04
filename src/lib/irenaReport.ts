/**
 * Programme baseline report (PDF) — county-agnostic.
 *
 * A bespoke, multi-section branded PDF built on the same jsPDF + jspdf-autotable
 * stack as src/lib/reportExport.ts (which only emits a single flat table).
 * autoTable is called repeatedly on one document, each table continuing from
 * doc.lastAutoTable.finalY; section headings are drawn with doc.text.
 *
 * The report combines a static county baseline (see src/lib/baseline/*) with the
 * live institution roster from the DB. Each section renders ONLY when the
 * baseline supplies its data, and section numbers are assigned dynamically — so
 * Taita Taveta (full workbook) and Makueni (survey subset, no electricity) both
 * produce a clean, gap-free report.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BRAND_NAME, BRAND_GREEN, todayStamp, safeFilename } from "@/lib/reportExport";
import type { ProgrammeBaseline, BaselineGroup } from "@/lib/baseline";
import type { ProgrammeInstitution } from "@/hooks/usePrograms";

// autoTable augments the jsPDF instance with lastAutoTable at runtime; the
// generated typings don't include it, so we read it through a narrow cast.
type WithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

const MARGIN = 40;
const fmtInt = (n: number) => Math.round(n).toLocaleString();
const fmtKsh = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

// --- roster formatters (mirror the on-screen ProgrammeDetail helpers) --------
const UNIT_BY_TYPE: Record<string, string> = {
  school: "students", prison: "inmates", hospital: "beds",
  hotel: "staff", restaurant: "staff",
};

function headcount(i: ProgrammeInstitution): string {
  const n = i.number_of_students ?? i.number_of_staff;
  if (n == null) return "—";
  const unit = UNIT_BY_TYPE[i.institution_type] ?? "people";
  return `${Number(n).toLocaleString()} ${unit}`;
}

function meals(i: ProgrammeInstitution): string {
  const m = i.meals_per_day ?? i.meals_served_per_day;
  return m != null ? Number(m).toLocaleString() : "—";
}

function contact(i: ProgrammeInstitution): string {
  return [i.contact_person, i.contact_phone].filter(Boolean).join(" · ") || "—";
}

// --- section helpers ---------------------------------------------------------
function nextY(doc: jsPDF, fallback: number): number {
  const y = (doc as WithAutoTable).lastAutoTable?.finalY;
  return y != null ? y : fallback;
}

/** Adds a section heading, page-breaking first if there isn't room below it. */
function sectionHeading(doc: jsPDF, text: string, y: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 90) {
    doc.addPage();
    y = MARGIN;
  }
  doc.setTextColor(...BRAND_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(text, MARGIN, y);
  return y + 6;
}

const tableTheme = {
  margin: { left: MARGIN, right: MARGIN },
  styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" as const },
  headStyles: { fillColor: BRAND_GREEN, textColor: 255, fontStyle: "bold" as const },
  alternateRowStyles: { fillColor: [245, 247, 250] as [number, number, number] },
};

export function exportBaselineReport(opts: {
  programme: { name: string };
  institutions: ProgrammeInstitution[];
  baseline: ProgrammeBaseline;
}): void {
  const { programme, institutions, baseline } = opts;
  const { meta } = baseline;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Dynamic section numbering so skipped sections leave no gaps.
  let sec = 0;
  const heading = (doc: jsPDF, title: string, y: number) =>
    sectionHeading(doc, `${++sec}. ${title}`, y);

  // ---- Cover / title block --------------------------------------------------
  doc.setFillColor(...BRAND_GREEN);
  doc.rect(0, 0, pageW, 150, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(BRAND_NAME, MARGIN, 40);
  doc.setFontSize(20);
  doc.text(meta.reportHeading ?? `${meta.county} Cooking Baseline`, MARGIN, 74);
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(meta.title, MARGIN, 98);
  doc.setFontSize(9);
  doc.text(meta.subtitle, MARGIN, 118, { maxWidth: pageW - MARGIN * 2 });

  let y = 178;
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(9);
  const coverLines = [
    `${meta.organisation} · ${meta.programme}`,
    meta.reference,
    `Collection period: ${meta.period}   ·   Sub-counties: ${meta.subCounties}`,
    `Programme: ${programme.name}`,
    `${meta.totalRecords.toLocaleString()} institutions${
      meta.rawVariables ? ` · ${meta.rawVariables.toLocaleString()} raw survey variables` : ""
    } · Generated ${todayStamp()}`,
    meta.confidentiality,
  ].filter(Boolean) as string[];
  coverLines.forEach((line) => { doc.text(line, MARGIN, y); y += 16; });

  // ---- Dataset overview -----------------------------------------------------
  const hasElec = baseline.groups.some((g) => g.electricityAccess);
  y = heading(doc, "Dataset overview", y + 12);
  autoTable(doc, {
    ...tableTheme,
    startY: y + 6,
    head: [[
      "Dataset", "Records", "Primary Cooking Fuel (Exact %)",
      ...(hasElec ? ["Electricity Access"] : []), "Key Population Metric",
    ]],
    body: baseline.groups.map((g) => [
      g.title, String(g.records), g.primaryFuel,
      ...(hasElec ? [g.electricityAccess ?? "—"] : []), g.keyPopulation,
    ]),
    columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 42, halign: "right" } },
  });
  y = nextY(doc, y);
  if (baseline.groups[0]?.funders) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Data collection: ${baseline.groups[0].funders}`, MARGIN, y + 14, { maxWidth: pageW - MARGIN * 2 });
    y += 24;
  } else {
    y += 6;
  }

  // ---- County totals (survey-derived baselines) -----------------------------
  if (baseline.totals) {
    const t = baseline.totals;
    y = heading(doc, "Baseline totals", y + 6);
    autoTable(doc, {
      ...tableTheme,
      startY: y + 6,
      head: [["Metric", "Value"]],
      body: [
        ["Institutions surveyed", fmtInt(t.institutions)],
        ["Population (learners / people)", fmtInt(t.population)],
        ["Firewood demand", `${fmtInt(t.firewoodTonnesPerMonth)} tonnes / month`],
        ["Firewood spend", `${fmtKsh(t.costKshPerMonth)} / month`],
        ...(t.dataCompleteness ? [["Data completeness", t.dataCompleteness]] : []),
      ],
      columnStyles: { 0: { cellWidth: 160 } },
    });
    y = nextY(doc, y);
  }

  // ---- Firewood demand & spend by sub-county (Makueni) ----------------------
  if (baseline.firewoodBySubCounty) {
    y = heading(doc, "Firewood demand & spend by sub-county", y + 18);
    autoTable(doc, {
      ...tableTheme,
      startY: y + 6,
      head: [["Sub-county", "Firewood (tonnes/mo)", "Cost (KES/mo)"]],
      body: baseline.firewoodBySubCounty.map((r) => [
        r.subCounty, fmtInt(r.tonnesPerMonth), fmtInt(r.costKshPerMonth),
      ]),
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });
    y = nextY(doc, y);
  }

  // ---- Institutions by education level (Makueni) ----------------------------
  if (baseline.levelDistribution) {
    y = heading(doc, "Institutions by education level", y + 18);
    autoTable(doc, {
      ...tableTheme,
      startY: y + 6,
      head: [["Level", "Institutions"]],
      body: baseline.levelDistribution.map((r) => [r.level, fmtInt(r.records)]),
      columnStyles: { 1: { halign: "right" } },
    });
    y = nextY(doc, y);
  }

  // ---- Key findings ---------------------------------------------------------
  if (baseline.keyFindings) {
    y = heading(doc, "Key findings requiring field attention", y + 6);
    autoTable(doc, {
      ...tableTheme,
      startY: y + 6,
      head: [["#", "Finding", "Detail"]],
      body: baseline.keyFindings.map((f) => [String(f.n), f.finding, f.detail]),
      columnStyles: { 0: { cellWidth: 20, halign: "right" }, 1: { cellWidth: 150 } },
    });
    y = nextY(doc, y);
  }

  // ---- Derived energy consumption ------------------------------------------
  if (baseline.energyByCategory && baseline.energyTotals) {
    y = heading(doc, "Derived annual energy consumption, by category", y + 24);
    autoTable(doc, {
      ...tableTheme,
      startY: y + 6,
      head: [["Category", "n (fuel)", "Annual Fuel (tonnes)", "n (elec.)", "Annual Electricity (kWh)"]],
      body: [
        ...baseline.energyByCategory.map((e) => [
          e.category, String(e.nFuel), fmtInt(e.fuelTonnes), String(e.nElec), fmtInt(e.elecKwh),
        ]),
        ["TOTAL (documented dataset)", "", fmtInt(baseline.energyTotals.fuelTonnes), "", fmtInt(baseline.energyTotals.elecKwh)],
      ],
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === baseline.energyByCategory!.length) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = nextY(doc, y);
    if (baseline.energyCoefficients) {
      autoTable(doc, {
        ...tableTheme,
        startY: y + 12,
        head: [["Price coefficient", "Value", "Source"]],
        body: baseline.energyCoefficients.map((c) => [c.fuel, c.price, c.source]),
      });
      y = nextY(doc, y);
    }
  }

  // ---- Aggregate annual operating cost -------------------------------------
  if (baseline.aggregateCost && baseline.aggregateCostTotal) {
    y = heading(doc, "Aggregate current annual operating cost (shortlisted candidates)", y + 24);
    autoTable(doc, {
      ...tableTheme,
      startY: y + 6,
      head: [["Institution", "Fuel (KES/mo)", "Electricity (KES/mo)", "Combined (KES/yr)"]],
      body: [
        ...baseline.aggregateCost.map((r) => [
          r.institution, fmtInt(r.fuelMonthly), fmtInt(r.elecMonthly), fmtInt(r.combinedAnnual),
        ]),
        [
          "TOTAL (named candidates)",
          fmtInt(baseline.aggregateCostTotal.fuelMonthly),
          fmtInt(baseline.aggregateCostTotal.elecMonthly),
          fmtInt(baseline.aggregateCostTotal.combinedAnnual),
        ],
      ],
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === baseline.aggregateCost!.length) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = nextY(doc, y);
  }

  // ---- Institution roster by category --------------------------------------
  y = heading(doc, "Institution roster by category", y + 24);
  doc.setFont("helvetica", "normal");
  baseline.groups.forEach((g: BaselineGroup) => {
    const field = g.matchField ?? "institution_type";
    const rows = institutions
      .filter((i) => g.institutionTypes.includes(String((i as Record<string, unknown>)[field] ?? "")))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!rows.length) return;
    y = sectionHeading(doc, `${g.title} (${rows.length})`, nextY(doc, y) + 20);
    autoTable(doc, {
      ...tableTheme,
      startY: y + 6,
      head: [["Institution", "Type", "People", "Meals/day", "Sub-county", "Contact"]],
      body: rows.map((i) => [
        i.name,
        String(i.institution_type).replace(/_/g, " "),
        headcount(i),
        meals(i),
        i.sub_county ?? "—",
        contact(i),
      ]),
      columnStyles: { 0: { cellWidth: 130 } },
    });
    y = nextY(doc, y);
  });

  // ---- Footer with page numbers --------------------------------------------
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Page ${p} of ${pageCount}  ·  ${BRAND_NAME}  ·  ${meta.confidentiality}  ·  ${todayStamp()}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 16,
      { align: "center" },
    );
  }

  doc.save(`${safeFilename(`${meta.county}-baseline`)}-${todayStamp()}.pdf`);
}
