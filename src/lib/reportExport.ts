/**
 * Centralised report export utilities.
 *
 * Every admin page wires up a DownloadReportButton that ultimately calls
 * exportExcel() or exportPdf() here, so the file format, header, brand,
 * and filename convention stay consistent across the platform.
 */

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ReportColumn<T = Record<string, unknown>> {
  /** Object key in the row, e.g. "full_name". Use a getter via `format` if you need a derived value. */
  key: keyof T | string;
  /** Header label shown in the spreadsheet/PDF, e.g. "Full Name". */
  label: string;
  /** Optional formatter — return a string or number for the cell. Receives the row, not just the value. */
  format?: (row: T) => string | number | null | undefined;
  /** Optional column width hint for PDF (in points). Excel auto-sizes. */
  pdfWidth?: number;
}

export interface ReportOptions {
  /** Human-readable report title shown at the top of the PDF and in the Excel sheet name. */
  title: string;
  /** Filename WITHOUT extension. Date stamp gets appended automatically. */
  filename: string;
  /** Optional subtitle line under the title (e.g. filter applied, county scope). */
  subtitle?: string;
}

const BRAND_NAME = "cleancookIQ";
const BRAND_GREEN: [number, number, number] = [26, 60, 46]; // #1a3c2e

function todayStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeFilename(base: string): string {
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function cellValue<T>(row: T, col: ReportColumn<T>): string | number {
  if (col.format) {
    const v = col.format(row);
    if (v === null || v === undefined) return "";
    return v;
  }
  const v = (row as Record<string, unknown>)[col.key as string];
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v instanceof Date) return v.toISOString();
  // Arrays / objects → JSON for human readability
  try { return JSON.stringify(v); } catch { return String(v); }
}

// ============================================================
// EXCEL
// ============================================================

export function exportExcel<T>(
  rows: T[],
  columns: ReportColumn<T>[],
  opts: ReportOptions,
): void {
  const headerRow = columns.map((c) => c.label);
  const dataRows = rows.map((r) => columns.map((c) => cellValue(r, c)));

  // Two prefix rows for context, then a blank, then the data.
  const sheetData: (string | number)[][] = [
    [`${BRAND_NAME} — ${opts.title}`],
    [opts.subtitle ?? `Generated ${todayStamp()}`],
    [],
    headerRow,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Auto-size columns based on content length (rough heuristic — caps at 50)
  const widths = columns.map((c, i) => {
    const headerLen = String(c.label).length;
    const maxDataLen = dataRows.reduce((m, r) => {
      const cell = r[i];
      const len = cell === null || cell === undefined ? 0 : String(cell).length;
      return Math.max(m, len);
    }, 0);
    return { wch: Math.min(Math.max(headerLen, maxDataLen) + 2, 50) };
  });
  ws["!cols"] = widths;

  // Bold the title and header rows
  if (ws["A1"]) ws["A1"].s = { font: { bold: true, sz: 14 } };
  for (let c = 0; c < columns.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 3, c });
    if (ws[addr]) ws[addr].s = { font: { bold: true } };
  }

  const wb = XLSX.utils.book_new();
  // Excel sheet names are limited to 31 chars and disallow some characters
  const sheetName = opts.title.slice(0, 31).replace(/[\\/?*[\]:]/g, "");
  XLSX.utils.book_append_sheet(wb, ws, sheetName || "Report");

  XLSX.writeFile(wb, `${safeFilename(opts.filename)}-${todayStamp()}.xlsx`);
}

// ============================================================
// PDF
// ============================================================

export function exportPdf<T>(
  rows: T[],
  columns: ReportColumn<T>[],
  opts: ReportOptions,
): void {
  // Landscape A4 — fits more columns comfortably.
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  // Branded header
  doc.setFillColor(...BRAND_GREEN);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 50, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(BRAND_NAME, 32, 32);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(opts.title, doc.internal.pageSize.getWidth() - 32, 32, { align: "right" });

  // Subtitle / generation note
  doc.setTextColor(75, 85, 99);
  doc.setFontSize(9);
  doc.text(opts.subtitle ?? `Generated ${todayStamp()}`, 32, 70);
  doc.text(`${rows.length} record${rows.length === 1 ? "" : "s"}`, doc.internal.pageSize.getWidth() - 32, 70, { align: "right" });

  // Table
  const head = [columns.map((c) => c.label)];
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = cellValue(r, c);
      return v === null || v === undefined ? "" : String(v);
    }),
  );

  autoTable(doc, {
    head,
    body,
    startY: 85,
    margin: { left: 32, right: 32 },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: BRAND_GREEN,
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: columns.reduce((acc, c, i) => {
      if (c.pdfWidth) acc[i] = { cellWidth: c.pdfWidth };
      return acc;
    }, {} as Record<number, { cellWidth: number }>),
    didDrawPage: (data) => {
      // Footer with page number
      const pageCount = doc.getNumberOfPages();
      const current = data.pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Page ${current} of ${pageCount}  ·  ${BRAND_NAME}  ·  ${todayStamp()}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 16,
        { align: "center" },
      );
    },
  });

  doc.save(`${safeFilename(opts.filename)}-${todayStamp()}.pdf`);
}
