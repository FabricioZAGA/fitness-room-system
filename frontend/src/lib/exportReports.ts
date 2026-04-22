/** Report export helpers — Excel via xlsx, PDF via jsPDF + jspdf-autotable. */

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function formatMXN(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function gymTitle(gymName: string, reportName: string, period?: string): string {
  return `${gymName} — ${reportName}${period ? ` (${period})` : ""}`;
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export function exportIncomeExcel(
  income: {
    grand_total: number;
    total_cash: number;
    total_card: number;
    total_transfer: number;
    by_type: Record<string, number>;
    days: { date: string; total: number; count: number }[];
  },
  period: string,
  gymName: string
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryRows = [
    ["Reporte de Ingresos", period],
    ["Studio", gymName],
    [],
    ["Concepto", "Monto"],
    ["Total del Período", income.grand_total],
    ["Efectivo", income.total_cash],
    ["Tarjeta", income.total_card],
    ["Transferencia", income.total_transfer],
    [],
    ["Por Categoría"],
    ...Object.entries(income.by_type).map(([type, amount]) => [type, amount]),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws1, "Resumen");

  // Sheet 2: Daily detail
  const dayRows = [
    ["Fecha", "Transacciones", "Total"],
    ...income.days
      .filter((d) => d.count > 0)
      .reverse()
      .map((d) => [d.date, d.count, d.total]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(dayRows);
  XLSX.utils.book_append_sheet(wb, ws2, "Detalle por Día");

  XLSX.writeFile(wb, `ingresos_${period.replace(/\s/g, "_")}.xlsx`);
}

export function exportRankingsExcel(
  rankings: { student_id: string; student_name: string; checkin_count: number }[],
  days: number,
  gymName: string
): void {
  const wb = XLSX.utils.book_new();
  const rows = [
    [`${gymName} — Rankings (últimos ${days} días)`],
    [],
    ["#", "Alumno", "Check-ins"],
    ...rankings.map((s, i) => [i + 1, s.student_name, s.checkin_count]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Rankings");
  XLSX.writeFile(wb, `rankings_${days}dias.xlsx`);
}

export function exportInactiveExcel(
  students: { student_id: string; student_name: string; email: string; phone?: string | null; last_checkin?: string | null }[],
  days: number,
  gymName: string
): void {
  const wb = XLSX.utils.book_new();
  const rows = [
    [`${gymName} — Alumnos Inactivos (+${days} días sin visita)`],
    [],
    ["Nombre", "Email", "Teléfono", "Último Check-in"],
    ...students.map((s) => [s.student_name, s.email, s.phone ?? "", s.last_checkin ?? "Nunca"]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Inactivos");
  XLSX.writeFile(wb, `inactivos_${days}dias.xlsx`);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

function createPdfBase(title: string): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(212, 175, 55); // gold
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-MX")}`, 14, 20);
  return doc;
}

export function exportIncomePDF(
  income: {
    grand_total: number;
    total_cash: number;
    total_card: number;
    total_transfer: number;
    by_type: Record<string, number>;
    days: { date: string; total: number; count: number }[];
  },
  period: string,
  gymName: string
): void {
  const doc = createPdfBase(gymTitle(gymName, "Reporte de Ingresos", period));

  autoTable(doc, {
    startY: 34,
    head: [["Concepto", "Monto"]],
    body: [
      ["Total del Período", formatMXN(income.grand_total)],
      ["Efectivo", formatMXN(income.total_cash)],
      ["Tarjeta", formatMXN(income.total_card)],
      ["Transferencia", formatMXN(income.total_transfer)],
    ],
    headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    theme: "grid",
  });

  if (Object.keys(income.by_type).length > 0) {
    const lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Por Categoría", 14, lastY);
    autoTable(doc, {
      startY: lastY + 4,
      head: [["Tipo", "Monto"]],
      body: Object.entries(income.by_type)
        .sort(([, a], [, b]) => b - a)
        .map(([type, amount]) => [type, formatMXN(amount)]),
      headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
      theme: "grid",
    });
  }

  const dayRows = income.days.filter((d) => d.count > 0).reverse();
  if (dayRows.length > 0) {
    const lastY2 = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Detalle por Día", 14, lastY2);
    autoTable(doc, {
      startY: lastY2 + 4,
      head: [["Fecha", "Transacciones", "Total"]],
      body: dayRows.map((d) => [d.date, d.count, formatMXN(d.total)]),
      headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
      theme: "grid",
    });
  }

  doc.save(`ingresos_${period.replace(/\s/g, "_")}.pdf`);
}

export function exportRankingsPDF(
  rankings: { student_id: string; student_name: string; checkin_count: number }[],
  days: number,
  gymName: string
): void {
  const doc = createPdfBase(gymTitle(gymName, `Rankings Top Alumnos (${days} días)`));
  autoTable(doc, {
    startY: 34,
    head: [["#", "Alumno", "Check-ins"]],
    body: rankings.map((s, i) => [i + 1, s.student_name, s.checkin_count]),
    headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
    columnStyles: { 0: { halign: "center", cellWidth: 15 }, 2: { halign: "center" } },
    theme: "grid",
  });
  doc.save(`rankings_${days}dias.pdf`);
}

export function exportInactivePDF(
  students: { student_id: string; student_name: string; email: string; phone?: string | null }[],
  days: number,
  gymName: string
): void {
  const doc = createPdfBase(gymTitle(gymName, `Alumnos Inactivos +${days} días`));
  autoTable(doc, {
    startY: 34,
    head: [["Nombre", "Email", "Teléfono"]],
    body: students.map((s) => [s.student_name, s.email, s.phone ?? "—"]),
    headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
    theme: "grid",
  });
  doc.save(`inactivos_${days}dias.pdf`);
}
