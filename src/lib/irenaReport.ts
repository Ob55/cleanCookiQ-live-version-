/**
 * IRENA – Taita Taveta full baseline report (PDF).
 *
 * A bespoke, multi-section branded PDF built on the same jsPDF + jspdf-autotable
 * stack as src/lib/reportExport.ts (which only emits a single flat table).
 * autoTable is called repeatedly on one document, each table continuing from
 * doc.lastAutoTable.finalY; section headings are drawn with doc.text.
 *
 * The report combines the static analyst baseline (workbook figures, see
 * src/lib/baseline/taitaTaveta.ts) with the live institution roster from the DB.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BRAND_NAME, BRAND_GREEN, todayStamp, safeFilename } from "@/lib/reportExport";
import type { TaitaTavetaBaseline, BaselineGroup } from "@/lib/baseline/taitaTaveta";
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

export function exportIrenaReport(opts: {
  programme: { name: string };
  institutions: ProgrammeInstitution[];
  baseline: TaitaTavetaBaseline;
}): void {
  const { programme, institutions, baseline } = opts;
  const { meta } = baseline;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // ---- Cover / title block --------------------------------------------------
  doc.setFillColor(...BRAND_GREEN);
  doc.rect(0, 0, pageW, 150, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(BRAND_NAME, MARGIN, 40);
  doc.setFontSize(20);
  doc.text("IRENA Clean Cooking Baseline", MARGIN, 74);
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
    `${meta.totalRecords.toLocaleString()} institutions · ${meta.rawVariables.toLocaleString()} raw survey variables · Generated ${todayStamp()}`,
    meta.confidentiality,
  ];
  coverLines.forEach((line) => { doc.text(line, MARGIN, y); y += 16; });

  // ---- 1. Dataset overview --------------------------------------------------
  y = sectionHeading(doc, "1. Dataset overview", y + 12);
  autoTable(doc, {
    ...tableTheme,
    startY: y + 6,
    head: [["Dataset", "Records", "Primary Cooking Fuel (Exact %)", "Electricity Access", "Key Population Metric"]],
    body: baseline.groups.map((g) => [g.title, String(g.records), g.primaryFuel, g.electricityAccess, g.keyPopulation]),
    columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 42, halign: "right" } },
  });
  y = nextY(doc, y);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Data collection: ${baseline.groups[0].funders}`, MARGIN, y + 14, { maxWidth: pageW - MARGIN * 2 });
  y += 24;

  // ---- 2. Key findings ------------------------------------------------------
  y = sectionHeading(doc, "2. Key findings requiring field attention", y + 6);
  autoTable(doc, {
    ...tableTheme,
    startY: y + 6,
    head: [["#", "Finding", "Detail"]],
    body: baseline.keyFindings.map((f) => [String(f.n), f.finding, f.detail]),
    columnStyles: { 0: { cellWidth: 20, halign: "right" }, 1: { cellWidth: 150 } },
  });
  y = nextY(doc, y);

  // ---- 3. Derived energy consumption ---------------------------------------
  y = sectionHeading(doc, "3. Derived annual energy consumption, by category", y + 24);
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
      if (data.section === "body" && data.row.index === baseline.energyByCategory.length) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = nextY(doc, y);
  autoTable(doc, {
    ...tableTheme,
    startY: y + 12,
    head: [["Price coefficient", "Value", "Source"]],
    body: baseline.energyCoefficients.map((c) => [c.fuel, c.price, c.source]),
  });
  y = nextY(doc, y);

  // ---- 4. Aggregate annual operating cost ----------------------------------
  y = sectionHeading(doc, "4. Aggregate current annual operating cost (17 shortlisted candidates)", y + 24);
  autoTable(doc, {
    ...tableTheme,
    startY: y + 6,
    head: [["Institution", "Fuel (KES/mo)", "Electricity (KES/mo)", "Combined (KES/yr)"]],
    body: [
      ...baseline.aggregateCost.map((r) => [
        r.institution, fmtInt(r.fuelMonthly), fmtInt(r.elecMonthly), fmtInt(r.combinedAnnual),
      ]),
      [
        "TOTAL (17 named candidates)",
        fmtInt(baseline.aggregateCostTotal.fuelMonthly),
        fmtInt(baseline.aggregateCostTotal.elecMonthly),
        fmtInt(baseline.aggregateCostTotal.combinedAnnual),
      ],
    ],
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === baseline.aggregateCost.length) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = nextY(doc, y);

  // ---- 5. Institution roster by category -----------------------------------
  y = sectionHeading(doc, "5. Institution roster by category", y + 24);
  doc.setFont("helvetica", "normal");
  baseline.groups.forEach((g: BaselineGroup) => {
    const rows = institutions
      .filter((i) => g.institutionTypes.includes(i.institution_type))
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

  doc.save(`${safeFilename(`irena-taita-taveta-baseline`)}-${todayStamp()}.pdf`);
}
