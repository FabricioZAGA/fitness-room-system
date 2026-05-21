/** Report export helpers — Excel via xlsx, PDF via jsPDF + jspdf-autotable. */

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  IncomeReport,
  MembershipRangeReport,
  StudentExportRow,
} from "@/types/report";

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

const TX_TYPE_LABEL: Record<string, string> = {
  membership: "Membresía",
  class_pack: "Pack de clases",
  product: "Producto",
  other: "Otro",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

const MEMBERSHIP_STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  expired: "Vencida",
  cancelled: "Cancelada",
  frozen: "Congelada",
};

function formatDateTime(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export function exportIncomeExcel(
  income: IncomeReport,
  period: string,
  gymName: string,
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumen
  const summaryRows: (string | number)[][] = [
    ["Reporte de Ingresos", period],
    ["Studio", gymName],
    ["Generado", new Date().toLocaleString("es-MX")],
    [],
    ["Concepto", "Monto"],
    ["Total del Período", income.grand_total],
    ["Efectivo", income.total_cash],
    ["Tarjeta", income.total_card],
    ["Transferencia", income.total_transfer],
    [],
    ["Por Categoría", "Monto"],
    ...Object.entries(income.by_type)
      .sort(([, a], [, b]) => b - a)
      .map(([type, amount]) => [TX_TYPE_LABEL[type] ?? type, amount]),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1["!cols"] = [{ wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Resumen");

  // Sheet 2: Detalle por Día (con cash/card/transfer)
  const dayRows: (string | number)[][] = [
    ["Fecha", "Movimientos", "Efectivo", "Tarjeta", "Transferencia", "Total"],
    ...income.days
      .filter((d) => d.count > 0)
      .reverse()
      .map((d) => [d.date, d.count, d.cash, d.card, d.transfer, d.total]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(dayRows);
  ws2["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Detalle por Día");

  // Sheet 3: Detalle de Transacciones (cuando se solicitó include_transactions)
  if (income.transactions && income.transactions.length > 0) {
    const txRows: (string | number)[][] = [
      ["Fecha", "Hora", "Alumno", "Tipo", "Método", "Monto", "Notas"],
      ...income.transactions
        .slice()
        .sort((a, b) => a.datetime.localeCompare(b.datetime))
        .map((t) => [
          t.date,
          formatTime(t.datetime),
          t.student_name || "—",
          TX_TYPE_LABEL[t.transaction_type] ?? t.transaction_type,
          PAYMENT_METHOD_LABEL[t.payment_method] ?? t.payment_method,
          t.amount,
          t.notes ?? "",
        ]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(txRows);
    ws3["!cols"] = [
      { wch: 12 },
      { wch: 8 },
      { wch: 30 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, ws3, "Transacciones");
  }

  XLSX.writeFile(wb, `ingresos_${period.replace(/\s/g, "_")}.xlsx`);
}

export function exportMembershipsRangeExcel(
  report: MembershipRangeReport,
  period: string,
  gymName: string,
): void {
  const wb = XLSX.utils.book_new();

  const summaryRows: (string | number)[][] = [
    ["Membresías por Rango", period],
    ["Studio", gymName],
    ["Generado", new Date().toLocaleString("es-MX")],
    [],
    ["Concepto", "Valor"],
    ["Total membresías iniciadas", report.count],
    ["Ingreso total estimado", report.total_revenue],
    [],
    ["Tipo", "Cantidad", "Ingreso"],
    ...Object.entries(report.by_type)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([type, agg]) => [type, agg.count, agg.revenue]),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Resumen");

  const detailRows: (string | number)[][] = [
    ["Inicio", "Fin", "Alumno", "Tipo", "Precio", "Status", "Sesiones rest."],
    ...report.memberships.map((m) => [
      m.start_date,
      m.end_date || "—",
      m.student_name || "—",
      m.membership_type,
      m.price,
      MEMBERSHIP_STATUS_LABEL[m.status] ?? m.status,
      m.classes_remaining ?? "—",
    ]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
  ws2["!cols"] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 30 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Detalle");

  XLSX.writeFile(wb, `membresias_${period.replace(/\s/g, "_")}.xlsx`);
}

export function exportRankingsExcel(
  rankings: { student_id: string; student_name: string; checkin_count: number }[],
  periodLabel: string,
  gymName: string,
): void {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [
    [`${gymName} — Rankings`, periodLabel],
    [],
    ["#", "Alumno", "Check-ins"],
    ...rankings.map((s, i) => [i + 1, s.student_name, s.checkin_count]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 6 }, { wch: 32 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "Rankings");
  XLSX.writeFile(wb, `rankings_${periodLabel.replace(/\s/g, "_")}.xlsx`);
}

export function exportInactiveExcel(
  students: {
    student_id: string;
    student_name: string;
    email: string;
    phone?: string | null;
    last_checkin?: string | null;
  }[],
  days: number,
  gymName: string,
): void {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [
    [`${gymName} — Alumnos Inactivos (+${days} días sin visita)`],
    [],
    ["Nombre", "Email", "Teléfono", "Último Check-in"],
    ...students.map((s) => [
      s.student_name,
      s.email,
      s.phone ?? "",
      s.last_checkin ?? "Nunca",
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, "Inactivos");
  XLSX.writeFile(wb, `inactivos_${days}dias.xlsx`);
}

export function exportAttendanceExcel(
  attendance: {
    period_label?: string;
    attended: number;
    no_show: number;
    confirmed: number;
    cancelled: number;
    total: number;
  },
  periodLabel: string,
  gymName: string,
): void {
  const wb = XLSX.utils.book_new();
  const rate =
    attendance.total > 0
      ? `${((attendance.attended / attendance.total) * 100).toFixed(1)}%`
      : "N/A";
  const noShowRate =
    attendance.total > 0
      ? `${((attendance.no_show / attendance.total) * 100).toFixed(1)}%`
      : "N/A";
  const rows: (string | number)[][] = [
    [`${gymName} — Reporte de Asistencia`, periodLabel],
    [],
    ["Métrica", "Cantidad"],
    ["Total Reservaciones", attendance.total],
    ["Asistieron", attendance.attended],
    ["No Show", attendance.no_show],
    ["Confirmadas (pendientes)", attendance.confirmed],
    ["Canceladas", attendance.cancelled],
    [],
    ["Tasa de Asistencia", rate],
    ["Tasa de No Show", noShowRate],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
  XLSX.writeFile(wb, `asistencia_${periodLabel.replace(/\s/g, "_")}.xlsx`);
}

export function exportUsersExcel(
  users: {
    username: string;
    email: string;
    name: string;
    status: string;
    enabled: boolean;
    groups: string[];
    created_at: string;
  }[],
  gymName: string,
): void {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [
    [`${gymName} — Reporte de Usuarios (${users.length})`],
    [],
    ["Nombre", "Email", "Status", "Habilitado", "Grupos", "Creado"],
    ...users.map((u) => [
      u.name,
      u.email,
      u.status,
      u.enabled ? "Sí" : "No",
      u.groups.join(", "),
      u.created_at ? u.created_at.slice(0, 10) : "",
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 30 }, { wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, "Usuarios");
  XLSX.writeFile(wb, "usuarios.xlsx");
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
  income: IncomeReport,
  period: string,
  gymName: string,
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
        .map(([type, amount]) => [TX_TYPE_LABEL[type] ?? type, formatMXN(amount)]),
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
      head: [["Fecha", "Mov.", "Efectivo", "Tarjeta", "Transf.", "Total"]],
      body: dayRows.map((d) => [
        d.date,
        d.count,
        formatMXN(d.cash),
        formatMXN(d.card),
        formatMXN(d.transfer),
        formatMXN(d.total),
      ]),
      headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
      styles: { fontSize: 8 },
      theme: "grid",
    });
  }

  // Transaction detail table (when include_transactions was requested)
  if (income.transactions && income.transactions.length > 0) {
    const lastYTx = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    if (lastYTx > 250) doc.addPage();
    const txStartY = lastYTx > 250 ? 14 : lastYTx;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Detalle de Transacciones", 14, txStartY);
    autoTable(doc, {
      startY: txStartY + 4,
      head: [["Fecha", "Hora", "Alumno", "Tipo", "Método", "Monto", "Notas"]],
      body: income.transactions
        .slice()
        .sort((a, b) => a.datetime.localeCompare(b.datetime))
        .map((t) => [
          t.date,
          formatTime(t.datetime),
          t.student_name || "—",
          TX_TYPE_LABEL[t.transaction_type] ?? t.transaction_type,
          PAYMENT_METHOD_LABEL[t.payment_method] ?? t.payment_method,
          formatMXN(t.amount),
          t.notes ?? "",
        ]),
      headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
      styles: { fontSize: 7 },
      columnStyles: { 6: { cellWidth: 40 } },
      theme: "grid",
    });
  }

  doc.save(`ingresos_${period.replace(/\s/g, "_")}.pdf`);
}

export function exportMembershipsRangePDF(
  report: MembershipRangeReport,
  period: string,
  gymName: string,
): void {
  const doc = createPdfBase(gymTitle(gymName, "Membresías por Rango", period));

  autoTable(doc, {
    startY: 34,
    head: [["Concepto", "Valor"]],
    body: [
      ["Total membresías", String(report.count)],
      ["Ingreso estimado", formatMXN(report.total_revenue)],
    ],
    headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
    theme: "grid",
  });

  const lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Detalle", 14, lastY);
  autoTable(doc, {
    startY: lastY + 4,
    head: [["Inicio", "Fin", "Alumno", "Tipo", "Precio", "Status"]],
    body: report.memberships.map((m) => [
      m.start_date,
      m.end_date || "—",
      m.student_name || "—",
      m.membership_type,
      formatMXN(m.price),
      MEMBERSHIP_STATUS_LABEL[m.status] ?? m.status,
    ]),
    headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
    styles: { fontSize: 8 },
    theme: "grid",
  });

  doc.save(`membresias_${period.replace(/\s/g, "_")}.pdf`);
}

export function exportRankingsPDF(
  rankings: { student_id: string; student_name: string; checkin_count: number }[],
  periodLabel: string,
  gymName: string,
): void {
  const doc = createPdfBase(gymTitle(gymName, "Rankings Top Alumnos", periodLabel));
  autoTable(doc, {
    startY: 34,
    head: [["#", "Alumno", "Check-ins"]],
    body: rankings.map((s, i) => [i + 1, s.student_name, s.checkin_count]),
    headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
    columnStyles: { 0: { halign: "center", cellWidth: 15 }, 2: { halign: "center" } },
    theme: "grid",
  });
  doc.save(`rankings_${periodLabel.replace(/\s/g, "_")}.pdf`);
}

export function exportAttendancePDF(
  attendance: {
    attended: number;
    no_show: number;
    confirmed: number;
    cancelled: number;
    total: number;
  },
  periodLabel: string,
  gymName: string,
): void {
  const doc = createPdfBase(gymTitle(gymName, "Reporte de Asistencia", periodLabel));
  const rate = attendance.total > 0 ? `${((attendance.attended / attendance.total) * 100).toFixed(1)}%` : "N/A";
  const noShowRate = attendance.total > 0 ? `${((attendance.no_show / attendance.total) * 100).toFixed(1)}%` : "N/A";
  autoTable(doc, {
    startY: 34,
    head: [["Métrica", "Cantidad"]],
    body: [
      ["Total Reservaciones", String(attendance.total)],
      ["Asistieron", String(attendance.attended)],
      ["No Show", String(attendance.no_show)],
      ["Confirmadas (pendientes)", String(attendance.confirmed)],
      ["Canceladas", String(attendance.cancelled)],
      ["Tasa de Asistencia", rate],
      ["Tasa de No Show", noShowRate],
    ],
    headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
    theme: "grid",
  });
  doc.save(`asistencia_${periodLabel.replace(/\s/g, "_")}.pdf`);
}

export function exportUsersPDF(
  users: {
    username: string;
    email: string;
    name: string;
    status: string;
    enabled: boolean;
    groups: string[];
    created_at: string;
  }[],
  gymName: string,
): void {
  const doc = createPdfBase(gymTitle(gymName, `Reporte de Usuarios (${users.length})`));
  autoTable(doc, {
    startY: 34,
    head: [["Nombre", "Email", "Status", "Habilitado", "Grupos", "Creado"]],
    body: users.map((u) => [
      u.name,
      u.email,
      u.status,
      u.enabled ? "Sí" : "No",
      u.groups.join(", "),
      u.created_at ? u.created_at.slice(0, 10) : "",
    ]),
    headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
    styles: { fontSize: 8 },
    theme: "grid",
  });
  doc.save("usuarios.pdf");
}

export function exportInactivePDF(
  students: {
    student_id: string;
    student_name: string;
    email: string;
    phone?: string | null;
    last_checkin?: string | null;
  }[],
  days: number,
  gymName: string,
): void {
  const doc = createPdfBase(gymTitle(gymName, `Alumnos Inactivos +${days} días`));
  autoTable(doc, {
    startY: 34,
    head: [["Nombre", "Email", "Teléfono", "Último Check-in"]],
    body: students.map((s) => [
      s.student_name,
      s.email,
      s.phone ?? "—",
      s.last_checkin ?? "Nunca",
    ]),
    headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
    styles: { fontSize: 9 },
    theme: "grid",
  });
  doc.save(`inactivos_${days}dias.pdf`);
}

// ─── Cash Cut Receipt ────────────────────────────────────────────────────────

export interface CashCutPDFData {
  cut_id: string;
  cut_date: string;
  total_cash: number;
  total_card: number;
  total_transfer: number;
  grand_total: number;
  transaction_count: number;
  notes: string | null;
  transactions: {
    transaction_id: string;
    student_id: string | null;
    transaction_type: string;
    amount: number;
    payment_method: string;
    notes: string | null;
    transaction_date: string;
    created_at: string;
  }[];
}

export function exportCashCutPDF(
  cut: CashCutPDFData,
  gymName: string,
): void {
  const doc = createPdfBase(gymTitle(gymName, "Corte de Caja", cut.cut_date));

  autoTable(doc, {
    startY: 34,
    head: [["Concepto", "Monto"]],
    body: [
      ["Efectivo", formatMXN(cut.total_cash)],
      ["Tarjeta", formatMXN(cut.total_card)],
      ["Transferencia", formatMXN(cut.total_transfer)],
      ["Total", formatMXN(cut.grand_total)],
      ["Transacciones", String(cut.transaction_count)],
    ],
    headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
    theme: "grid",
  });

  if (cut.notes) {
    const lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(`Notas: ${cut.notes}`, 14, lastY);
  }

  if (cut.transactions.length > 0) {
    const lastY2 = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + (cut.notes ? 14 : 8);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Detalle de Transacciones", 14, lastY2);
    autoTable(doc, {
      startY: lastY2 + 4,
      head: [["Hora", "Tipo", "Método", "Monto", "Notas"]],
      body: cut.transactions.map((t) => [
        formatTime(t.created_at),
        TX_TYPE_LABEL[t.transaction_type] ?? t.transaction_type,
        PAYMENT_METHOD_LABEL[t.payment_method] ?? t.payment_method,
        formatMXN(t.amount),
        t.notes ?? "",
      ]),
      headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
      styles: { fontSize: 8 },
      theme: "grid",
    });
  }

  doc.save(`corte_${cut.cut_date}.pdf`);
}

// ─── Students Directory Excel/PDF ────────────────────────────────────────────

const STUDENT_STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  suspended: "Suspendido",
};

const MEMBERSHIP_TYPE_LABEL: Record<string, string> = {
  founder_monthly: "Socio Fundador",
  room_daily: "Room Daily",
  room_elite: "Room Elite",
  room_flex: "Room Flex",
  room_pass: "Room Pass",
};

export function exportStudentsDirectoryExcel(
  students: StudentExportRow[],
  gymName: string,
): void {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [
    [`${gymName} — Directorio de Alumnos (${students.length})`],
    ["Generado", new Date().toLocaleString("es-MX")],
    [],
    ["Nombre", "Email", "Teléfono", "Fecha Nac.", "Estado", "Membresía", "Vencimiento", "Precio", "Inscripción"],
    ...students.map((s) => [
      s.full_name,
      s.email,
      s.phone || "—",
      s.birth_date || "—",
      STUDENT_STATUS_LABEL[s.status] ?? s.status,
      (MEMBERSHIP_TYPE_LABEL[s.membership_type] ?? s.membership_type) || "Sin membresía",
      s.membership_expiry || "—",
      s.membership_price || 0,
      s.created_at ? s.created_at.slice(0, 10) : "",
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 30 }, { wch: 28 }, { wch: 16 }, { wch: 12 },
    { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Alumnos");
  XLSX.writeFile(wb, "directorio_alumnos.xlsx");
}

export function exportStudentsDirectoryPDF(
  students: StudentExportRow[],
  gymName: string,
): void {
  const doc = createPdfBase(gymTitle(gymName, `Directorio de Alumnos (${students.length})`));
  autoTable(doc, {
    startY: 34,
    head: [["Nombre", "Email", "Tel.", "Estado", "Membresía", "Vence", "Precio"]],
    body: students.map((s) => [
      s.full_name,
      s.email,
      s.phone || "—",
      STUDENT_STATUS_LABEL[s.status] ?? s.status,
      (MEMBERSHIP_TYPE_LABEL[s.membership_type] ?? s.membership_type) || "—",
      s.membership_expiry || "—",
      s.membership_price ? formatMXN(s.membership_price) : "—",
    ]),
    headStyles: { fillColor: [20, 20, 20], textColor: [212, 175, 55], fontStyle: "bold" },
    styles: { fontSize: 7 },
    theme: "grid",
  });
  doc.save("directorio_alumnos.pdf");
}

// formatDateTime is used downstream from exports; suppress unused warning if any.
export const _formatDateTimeForRow = formatDateTime;
