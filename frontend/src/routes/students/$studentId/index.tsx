import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, CreditCard, Calendar, Plus, Power, PowerOff,
  Pencil, Mail, Phone, User, CheckCircle2, XCircle, Clock,
  Snowflake, QrCode, Download, ShieldBan, ShieldCheck,
  Send, RefreshCw, Wallet, AlertTriangle,
  Lock, Eye, EyeOff, Copy, Mail as MailIcon,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useStudent, useActivateStudent, useDeactivateStudent,
  useSuspendStudent, useUnsuspendStudent, useStudentQr,
  useResendWelcome, useUpdateContact,
  useAdminResetPassword,
} from "@/hooks/useStudents";
import { useAuth } from "@/contexts/AuthContext";
import type { PasswordResetResponse } from "@/services/studentService";
import { useMembershipsForStudent, useFreezeMembership, useUnfreezeMembership } from "@/hooks/useMemberships";
import { useReservationsForStudent } from "@/hooks/useReservations";
import { useClasses } from "@/hooks/useClasses";
import { StudentStatusBadge, MembershipStatusBadge, ReservationStatusBadge } from "@/components/shared/StatusBadge";
import { CreateMembershipModal } from "@/components/shared/CreateMembershipModal";
import { EditMembershipModal } from "@/components/shared/EditMembershipModal";
import { EditStudentModal } from "@/components/shared/EditStudentModal";
import { Dialog } from "@/components/shared/Dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { MEMBERSHIP_TYPE_LABELS } from "@/types/membership";
import { CLASS_TYPE_LABELS } from "@/types/class";
import { PAYMENT_METHOD_LABELS } from "@/types/transaction";
import type { PaymentMethod } from "@/types/transaction";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { useStudentBalance, useBalanceMovements, useDeposit } from "@/hooks/useBalance";
import { useStudentDebts, usePayDebt, usePayAllDebts } from "@/hooks/useDebts";
import { BALANCE_MOVEMENT_TYPE_LABELS, type BalanceMovementType } from "@/types/balance";

export const Route = createFileRoute("/students/$studentId/")({
  component: StudentDetailPage,
});

const ATTENDANCE_ICON: Record<string, React.ReactNode> = {
  attended: <CheckCircle2 className="h-4 w-4 text-[--color-success]" />,
  no_show:  <XCircle className="h-4 w-4 text-[--color-danger]" />,
  confirmed: <Clock className="h-4 w-4 text-[--color-warning]" />,
  waitlisted: <Clock className="h-4 w-4 text-[--tx-disabled]" />,
  cancelled:  <XCircle className="h-4 w-4 text-[--tx-disabled]" />,
};

function StudentDetailPage(): React.JSX.Element {
  const { studentId } = Route.useParams();
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeMembershipId, setFreezeMembershipId] = useState<string | null>(null);
  const [freezeDays, setFreezeDays] = useState(14);
  const [editMembershipId, setEditMembershipId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);

  const { data: student, isLoading } = useStudent(studentId);
  const { data: membershipsData } = useMembershipsForStudent(studentId);
  const memberships = membershipsData?.items ?? [];
  const { data: reservationsData } = useReservationsForStudent(studentId);
  const reservations = reservationsData?.items ?? [];
  const { data: classesData } = useClasses({ limit: 200 });
  const { mutate: activate, isPending: activating } = useActivateStudent();
  const { mutate: deactivate, isPending: deactivating } = useDeactivateStudent();
  const { mutate: suspend, isPending: suspending } = useSuspendStudent();
  const { mutate: unsuspend, isPending: unsuspending } = useUnsuspendStudent();
  const { mutate: freeze, isPending: freezing } = useFreezeMembership();
  const { mutate: unfreeze, isPending: unfreezing } = useUnfreezeMembership();
  const { data: qrData } = useStudentQr(qrOpen ? studentId : "");
  const { mutate: resendWelcome, isPending: sendingWelcome } = useResendWelcome();
  const updateContact = useUpdateContact(studentId);
  const { data: balance } = useStudentBalance(studentId);
  const { data: movements = [] } = useBalanceMovements(studentId);
  const { data: debts = [] } = useStudentDebts(studentId);
  const depositMutation = useDeposit();
  const payDebtMutation = usePayDebt();
  const payAllDebtsMutation = usePayAllDebts();

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>("cash");
  const [depositNotes, setDepositNotes] = useState("");
  const [debtPayMethod, setDebtPayMethod] = useState<PaymentMethod>("cash");

  const [contactOpen, setContactOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [skipPwdChange, setSkipPwdChange] = useState(true);

  // Admin password reset
  const { isAdmin } = useAuth();
  const adminResetPwd = useAdminResetPassword();
  const [pwdResetOpen, setPwdResetOpen] = useState(false);
  const [pwdPermanent, setPwdPermanent] = useState(true);
  const [pwdSendEmail, setPwdSendEmail] = useState(false);
  const [pwdResult, setPwdResult] = useState<PasswordResetResponse | null>(null);
  const [pwdVisible, setPwdVisible] = useState(false);
  const [pwdCustomMode, setPwdCustomMode] = useState(true);
  const [pwdCustomValue, setPwdCustomValue] = useState("");

  const { t } = useTranslation();

  const classMap = useMemo(() => {
    const map: Record<string, { type: string; date: string; instructor: string }> = {};
    for (const c of classesData?.items ?? []) {
      map[c.class_id] = {
        type: c.class_type,
        date: c.class_date,
        instructor: c.instructor_name,
      };
    }
    return map;
  }, [classesData]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[--gold] border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg text-[--tx-muted]">Miembro no encontrado.</p>
        <Link to="/students" className="text-[--gold] hover:text-[--gold-hover]">
          ← Volver a miembros
        </Link>
      </div>
    );
  }

  const isActive = student.status === "active";
  const isSuspended = student.status === "suspended";
  const isInactive = student.status === "inactive";
  const activeMembership = memberships.find((m) => m.status === "active");
  const attendedCount = reservations.filter((r) => r.status === "attended").length;

  return (
    <>
      <div className="min-h-screen bg-[--bg-base] p-6">
        {/* Back */}
        <Link
          to="/students"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[--tx-muted] hover:text-[--tx-primary] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a miembros
        </Link>

        {/* Hero header */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-5">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.full_name}
                className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold shadow-lg"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                  boxShadow: "0 10px 25px var(--gold-bg)"
                }}>
                {getInitials(student.full_name)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-[--tx-primary]">{student.full_name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[--tx-muted]">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{student.email}</span>
                {student.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{student.phone}</span>
                )}
                {student.age !== null && student.age !== undefined && (
                  <span className="text-[--tx-disabled]">{student.age} años</span>
                )}
                {student.city && (
                  <span className="text-[--tx-disabled]">{student.city}</span>
                )}
              </div>
              {student.address && (
                <p className="mt-1 text-xs text-[--tx-disabled]">{student.address}</p>
              )}
              {student.emergency_contact && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-[--color-warning-bd] bg-[--color-warning-bg] px-3 py-1.5 text-xs">
                  <span className="font-medium text-[--color-warning]">Emergencia:</span>
                  <span className="text-[--tx-primary]">{student.emergency_contact.name} ({student.emergency_contact.relationship})</span>
                  <span className="text-[--tx-muted]">{student.emergency_contact.phone}</span>
                </div>
              )}
              <div className="mt-2"><StudentStatusBadge status={student.status} /></div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              onClick={() => setQrOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-2.5 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold]"
            >
              <QrCode className="h-4 w-4" />
              QR
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-2.5 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--bd-default] hover:text-[--tx-primary]"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>

            {isActive && (
              <>
                <button
                  onClick={() => setSuspendConfirmOpen(true)}
                  disabled={suspending}
                  className="flex items-center gap-2 rounded-xl border border-[--color-warning-bd] bg-[--color-warning-bg] px-4 py-2.5 text-sm font-medium text-[--color-warning] transition-all disabled:opacity-50"
                >
                  <ShieldBan className="h-4 w-4" />
                  Suspender
                </button>
                <button
                  onClick={() => setDeactivateConfirmOpen(true)}
                  disabled={deactivating}
                  className="flex items-center gap-2 rounded-xl border border-[--color-danger-bd] bg-[--color-danger-bg] px-4 py-2.5 text-sm font-medium text-[--color-danger] transition-all disabled:opacity-50"
                >
                  <PowerOff className="h-4 w-4" />
                  Desactivar
                </button>
              </>
            )}

            {isSuspended && (
              <button
                onClick={() => unsuspend(studentId)}
                disabled={unsuspending}
                className="flex items-center gap-2 rounded-xl border border-[--color-success-bd] bg-[--color-success-bg] px-4 py-2.5 text-sm font-medium text-[--color-success] transition-all disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                Reactivar
              </button>
            )}

            {isInactive && (
              <button
                onClick={() => activate(studentId)}
                disabled={activating}
                className="flex items-center gap-2 rounded-xl border border-[--color-success-bd] bg-[--color-success-bg] px-4 py-2.5 text-sm font-medium text-[--color-success] transition-all disabled:opacity-50"
              >
                <Power className="h-4 w-4" />
                Activar
              </button>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<CreditCard className="h-6 w-6 text-[--color-success]" />}
            label="Membresía activa"
            value={activeMembership ? MEMBERSHIP_TYPE_LABELS[activeMembership.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS] : "Sin membresía"}
            sub={activeMembership ? `Vence ${formatDate(activeMembership.end_date)}` : "Asigna una membresía"}
            color="emerald"
          />
          <StatCard
            icon={<Calendar className="h-6 w-6 text-[--color-info]" />}
            label="Reservaciones"
            value={String(reservations.length)}
            sub={`${attendedCount} asistencias`}
            color="blue"
          />
          <StatCard
            icon={<User className="h-6 w-6 text-[--tx-muted]" />}
            label="Miembro desde"
            value={formatDate(student.created_at)}
            sub={student.notes ?? "Sin notas"}
            color="slate"
          />
        </div>

        {/* Notifications & Contact section */}
        <div className="mb-8 rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
          <h2 className="mb-4 text-base font-semibold text-[--tx-primary]">
            {t("students.notifications")}
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => resendWelcome(studentId)}
              disabled={sendingWelcome}
              className="flex items-center gap-2 rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-2.5 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sendingWelcome ? t("students.sending") : t("students.resendWelcome")}
            </button>

            <button
              onClick={() => {
                setNewEmail(student.email);
                setNewPhone(student.phone ?? "");
                setContactOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-[--color-info-bd] bg-[--color-info-bg] px-4 py-2.5 text-sm font-medium text-[--color-info] transition-all hover:opacity-80"
            >
              <RefreshCw className="h-4 w-4" />
              {t("students.updateContact")}
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setPwdResult(null);
                  setPwdVisible(false);
                  setPwdPermanent(true);
                  setPwdSendEmail(false);
                  setPwdCustomMode(true);
                  setPwdCustomValue("");
                  setPwdResetOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl border border-[--gold-bd] bg-[--gold-bg] px-4 py-2.5 text-sm font-semibold text-[--gold] transition-all hover:opacity-80"
              >
                <Lock className="h-4 w-4" />
                Resetear Contraseña
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-[--tx-disabled]">
            {t("students.updateContactDesc")}
          </p>
        </div>

        {/* ── Balance + Debts row ── */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Balance section */}
          <section className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[--gold]" />
                <h2 className="text-base font-semibold text-[--tx-primary]">{t("balance.title")}</h2>
              </div>
              <button
                onClick={() => { setDepositOpen(true); setDepositAmount(0); setDepositNotes(""); }}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)"
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("balance.deposit")}
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-[--gold-bd] bg-[--gold-bg] px-4 py-3">
              <p className="text-xs text-[--tx-muted]">{t("balance.currentBalance")}</p>
              <p className="text-2xl font-bold text-[--gold]">{formatCurrency(balance?.current_balance ?? 0)}</p>
            </div>

            {movements.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-[--tx-muted]">{t("balance.history")}</p>
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {movements.slice(0, 10).map((m) => (
                    <div key={m.movement_id} className="flex items-center justify-between rounded-lg border border-[--bd-subtle] bg-[--bg-muted]/40 px-3 py-2 text-xs">
                      <div>
                        <span className="font-medium text-[--tx-primary]">
                          {BALANCE_MOVEMENT_TYPE_LABELS[m.movement_type as BalanceMovementType] ?? m.movement_type}
                        </span>
                        {m.notes && <span className="ml-2 text-[--tx-disabled]">{m.notes}</span>}
                      </div>
                      <span className={`font-semibold ${m.amount >= 0 ? "text-[--color-success]" : "text-[--color-danger]"}`}>
                        {m.amount >= 0 ? "+" : ""}{formatCurrency(m.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {movements.length === 0 && (
              <p className="text-center text-xs text-[--tx-disabled] py-4">{t("balance.noMovements")}</p>
            )}
          </section>

          {/* Debts section */}
          <section className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-[--color-danger]" />
                <h2 className="text-base font-semibold text-[--tx-primary]">{t("debt.title")}</h2>
                {debts.length > 0 && (
                  <span className="rounded-full bg-[--color-danger-bg] px-2 py-0.5 text-xs font-bold text-[--color-danger]">
                    {debts.length}
                  </span>
                )}
              </div>
              {debts.length > 1 && (
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-lg border border-[--bd-default] bg-[--bg-muted] px-2 py-1.5 text-xs text-[--tx-primary]"
                    value={debtPayMethod}
                    onChange={(e) => setDebtPayMethod(e.target.value as PaymentMethod)}
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => payAllDebtsMutation.mutate({
                      studentId,
                      data: { payment_method: debtPayMethod },
                    })}
                    disabled={payAllDebtsMutation.isPending}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: "var(--color-danger)" }}
                  >
                    {payAllDebtsMutation.isPending ? t("common.saving") : t("debt.payAll")}
                  </button>
                </div>
              )}
            </div>

            {debts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="mb-3 h-10 w-10 text-[--color-success]" />
                <p className="text-[--tx-muted]">{t("debt.noDebts")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {debts.map((d) => (
                  <div key={d.sale_id} className="flex items-center justify-between rounded-xl border border-[--color-danger-bd] bg-[--color-danger-bg] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[--tx-primary]">{d.product_name}</p>
                      <p className="text-xs text-[--tx-muted]">
                        {t("debt.quantity", { count: d.quantity })} · {formatDate(d.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[--color-danger]">{formatCurrency(d.amount)}</span>
                      <button
                        onClick={() => payDebtMutation.mutate({
                          studentId,
                          saleId: d.sale_id,
                          data: { payment_method: debtPayMethod },
                        })}
                        disabled={payDebtMutation.isPending}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all disabled:opacity-50"
                        style={{ background: "var(--color-danger)" }}
                      >
                        {payDebtMutation.isPending ? t("common.saving") : t("debt.pay")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Memberships */}
          <section className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[--tx-primary]">Membresías</h2>
              <button
                onClick={() => setMembershipModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)"
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva
              </button>
            </div>

            {memberships.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CreditCard className="mb-3 h-10 w-10 text-[--tx-disabled]" />
                <p className="text-[--tx-muted]">{t("classes.noMembershipsRegistered")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {memberships.map((m) => (
                  <div
                    key={m.membership_id}
                    className={`rounded-xl border p-4 transition-all ${
                      m.status === "active"
                        ? "border-[--color-success-bd] bg-[--color-success-bg]"
                        : m.status === "frozen"
                        ? "border-[--color-info-bd] bg-[--color-info-bg]"
                        : "border-[--bd-default] bg-[--bg-muted]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-[--tx-primary]">
                        {MEMBERSHIP_TYPE_LABELS[m.membership_type as keyof typeof MEMBERSHIP_TYPE_LABELS]}
                      </p>
                      <div className="flex items-center gap-2">
                        <MembershipStatusBadge status={m.status} />
                        <button
                          onClick={() => setEditMembershipId(m.membership_id)}
                          className="flex items-center gap-1 rounded-lg border border-[--bd-default] bg-[--bg-muted] px-2 py-1 text-xs font-medium text-[--tx-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold]"
                          title="Editar membresía"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </button>
                        {m.status === "active" && (
                          <button
                            onClick={() => { setFreezeMembershipId(m.membership_id); setFreezeOpen(true); }}
                            className="flex items-center gap-1 rounded-lg border border-[--color-info-bd] bg-[--color-info-bg] px-2 py-1 text-xs font-medium text-[--color-info] transition-all hover:opacity-80"
                          >
                            <Snowflake className="h-3 w-3" />
                            Congelar
                          </button>
                        )}
                        {m.status === "frozen" && (
                          <button
                            onClick={() => unfreeze({ studentId, membershipId: m.membership_id })}
                            disabled={unfreezing}
                            className="flex items-center gap-1 rounded-lg border border-[--color-success-bd] bg-[--color-success-bg] px-2 py-1 text-xs font-medium text-[--color-success] transition-all hover:opacity-80 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Reactivar
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[--tx-muted]">
                      <span>{formatDate(m.start_date)} → {formatDate(m.end_date)}</span>
                      <span className="font-medium text-[--tx-primary]">{formatCurrency(m.price_paid)}</span>
                      {m.classes_remaining !== null && (
                        <span className="text-[--color-success]">{m.classes_remaining} clases restantes</span>
                      )}
                      {m.is_frozen && m.freeze_end_date && (
                        <span className="flex items-center gap-1 text-[--color-info]">
                          <Snowflake className="h-3 w-3" />
                          Congelada hasta {formatDate(m.freeze_end_date)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Reservation history */}
          <section className="rounded-2xl border border-[--bd-default] bg-[--bg-surface] p-6">
            <h2 className="mb-5 text-base font-semibold text-[--tx-primary]">
              Historial de clases
              {reservations.length > 0 && (
                <span className="ml-2 rounded-full bg-[--bg-muted] px-2 py-0.5 text-xs font-normal text-[--tx-muted]">
                  {reservations.length}
                </span>
              )}
            </h2>

            {reservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Calendar className="mb-3 h-10 w-10 text-[--tx-disabled]" />
                <p className="text-[--tx-muted]">{t("classes.noReservationsRegistered")}</p>
              </div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {reservations.map((res) => {
                  const cls = classMap[res.class_id ?? ""];
                  return (
                    <div
                      key={res.reservation_id}
                      className="flex items-center justify-between rounded-xl border border-[--bd-default] bg-[--bg-muted]/40 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span>{ATTENDANCE_ICON[res.status] ?? ATTENDANCE_ICON["confirmed"]}</span>
                        <div>
                          <p className="text-sm font-medium text-[--tx-primary]">
                            {cls
                              ? CLASS_TYPE_LABELS[cls.type as keyof typeof CLASS_TYPE_LABELS] ?? cls.type
                              : "Clase"}
                          </p>
                          <p className="text-xs text-[--tx-disabled]">
                            {cls ? formatDate(cls.date) : res.class_date ? formatDate(res.class_date) : "—"}
                            {cls && <span className="ml-2 text-[--tx-disabled]">· {cls.instructor}</span>}
                          </p>
                        </div>
                      </div>
                      <ReservationStatusBadge status={res.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <CreateMembershipModal
        open={membershipModalOpen}
        onClose={() => setMembershipModalOpen(false)}
        studentId={studentId}
      />
      <EditStudentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        student={student}
      />
      <EditMembershipModal
        open={!!editMembershipId}
        onClose={() => setEditMembershipId(null)}
        membership={
          editMembershipId
            ? memberships.find((m) => m.membership_id === editMembershipId) ?? null
            : null
        }
      />

      {/* Freeze membership modal */}
      <Dialog open={freezeOpen} onClose={() => setFreezeOpen(false)} title="Congelar Membresía">
        <div className="space-y-5">
          <p className="text-sm text-[--tx-muted]">
            La membresía será suspendida y la fecha de vencimiento se extenderá por los días
            seleccionados. Ideal para lesiones, viajes o imprevistos.
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
              Días a congelar
            </label>
            <div className="flex flex-wrap gap-2">
              {[7, 14, 21, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setFreezeDays(d)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold transition-all"
                  style={
                    freezeDays === d
                      ? { background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)", color: "var(--gold-fg)" }
                      : { border: "1px solid var(--bd-default)", background: "var(--bg-muted)", color: "var(--tx-muted)" }
                  }
                >
                  {d} días
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={180}
              value={freezeDays}
              onChange={(e) => setFreezeDays(Math.max(1, Math.min(180, Number(e.target.value))))}
              className="mt-3 w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]"
              placeholder="O escribe días personalizados (1-180)"
            />
          </div>
          <div className="rounded-xl border border-[--color-info-bd] bg-[--color-info-bg] p-3 text-xs text-[--color-info]">
            La fecha de vencimiento se extenderá <strong>{freezeDays} días</strong> automáticamente.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setFreezeOpen(false)}
              className="rounded-xl border border-[--bd-default] px-4 py-2.5 text-sm text-[--tx-muted] transition-all hover:border-[--bd-subtle] hover:text-[--tx-primary]"
            >
              Cancelar
            </button>
            <button
              disabled={freezing || !freezeMembershipId}
              onClick={() => {
                if (!freezeMembershipId) return;
                freeze(
                  { studentId, membershipId: freezeMembershipId, data: { days: freezeDays } },
                  { onSuccess: () => setFreezeOpen(false) }
                );
              }}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                color: "var(--gold-fg)",
              }}
            >
              <Snowflake className="h-4 w-4" />
              {freezing ? "Congelando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Deactivate confirmation */}
      <ConfirmDialog
        open={deactivateConfirmOpen}
        onClose={() => setDeactivateConfirmOpen(false)}
        onConfirm={() => {
          deactivate(studentId);
          setDeactivateConfirmOpen(false);
        }}
        title="Desactivar miembro"
        description={`¿Desactivar a ${student.full_name}? Su membresía activa será cancelada automáticamente. Para volver, deberás activarlo y asignar una nueva membresía.`}
        confirmLabel="Desactivar"
        variant="danger"
        loading={deactivating}
      />

      {/* Suspend confirmation */}
      <ConfirmDialog
        open={suspendConfirmOpen}
        onClose={() => setSuspendConfirmOpen(false)}
        onConfirm={() => {
          suspend(studentId);
          setSuspendConfirmOpen(false);
        }}
        title="Suspender miembro"
        description={`¿Suspender temporalmente a ${student.full_name}? Su membresía activa será congelada automáticamente. Cuando lo reactives, su membresía se descongelará.`}
        confirmLabel="Suspender"
        variant="warning"
        loading={suspending}
      />

      {/* Update Contact modal */}
      <Dialog open={contactOpen} onClose={() => setContactOpen(false)} title={t("students.updateContact")}>
        <div className="space-y-5">
          <p className="text-sm text-[--tx-muted]">
            {t("students.updateContactDesc")}
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
              {t("students.newEmail")}
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
              {t("students.newPhone")}
            </label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+52 1234567890"
              className="w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={skipPwdChange}
              onChange={(e) => setSkipPwdChange(e.target.checked)}
              className="h-4 w-4 rounded accent-[--gold]"
            />
            <div>
              <span className="text-sm text-[--tx-primary]">{t("students.skipPasswordChange")}</span>
              <p className="text-xs text-[--tx-disabled]">{t("students.skipPasswordChangeHint")}</p>
            </div>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setContactOpen(false)}
              className="rounded-xl border border-[--bd-default] px-4 py-2.5 text-sm text-[--tx-muted] transition-all hover:border-[--bd-subtle] hover:text-[--tx-primary]"
            >
              Cancelar
            </button>
            <button
              disabled={updateContact.isPending}
              onClick={() => {
                updateContact.mutate(
                  {
                    email: newEmail !== student.email ? newEmail : undefined,
                    phone: newPhone !== (student.phone ?? "") ? newPhone : undefined,
                    skip_password_change: skipPwdChange,
                    resend_all: true,
                  },
                  { onSuccess: () => setContactOpen(false) }
                );
              }}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                color: "var(--gold-fg)",
              }}
            >
              <RefreshCw className="h-4 w-4" />
              {updateContact.isPending ? t("students.sending") : t("students.confirmUpdateContact")}
            </button>
          </div>
        </div>
      </Dialog>

      {/* QR modal */}
      <Dialog open={qrOpen} onClose={() => setQrOpen(false)} title={`Código QR — ${student.full_name}`}>
        <div className="flex flex-col items-center gap-5">
          <p className="text-center text-sm text-[--tx-muted]">
            El alumno puede mostrar este código en la recepción o kiosco para hacer check-in.
          </p>
          {qrData ? (
            <>
              <div className="rounded-2xl border-4 border-[--gold] bg-white p-2">
                <img
                  src={`data:${qrData.mime_type};base64,${qrData.qr_base64}`}
                  alt={`QR de ${qrData.student_name}`}
                  className="h-56 w-56"
                />
              </div>
              <a
                href={`data:${qrData.mime_type};base64,${qrData.qr_base64}`}
                download={`qr_${studentId}.png`}
                className="flex items-center gap-2 rounded-xl border border-[--bd-default] px-4 py-2.5 text-sm font-medium text-[--tx-muted] transition-all hover:border-[--gold-bd] hover:text-[--gold]"
              >
                <Download className="h-4 w-4" />
                Descargar QR
              </a>
            </>
          ) : (
            <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-[--bd-default] bg-[--bg-muted]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[--gold] border-t-transparent" />
            </div>
          )}
        </div>
      </Dialog>

      {/* Deposit modal */}
      <Dialog open={depositOpen} onClose={() => setDepositOpen(false)} title={t("balance.depositTitle")}>
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
              {t("caja.depositAmount")} *
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={depositAmount || ""}
              onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
              {t("caja.paymentMethod")} *
            </label>
            <select
              className="w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]"
              value={depositMethod}
              onChange={(e) => setDepositMethod(e.target.value as PaymentMethod)}
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[--tx-muted]">
              {t("caja.depositNotes")}
            </label>
            <input
              value={depositNotes}
              onChange={(e) => setDepositNotes(e.target.value)}
              placeholder={t("caja.depositNotesPlaceholder")}
              className="w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDepositOpen(false)}
              className="rounded-xl border border-[--bd-default] px-4 py-2.5 text-sm text-[--tx-muted] transition-all hover:border-[--bd-subtle] hover:text-[--tx-primary]"
            >
              {t("common.cancel")}
            </button>
            <button
              disabled={depositMutation.isPending || depositAmount <= 0}
              onClick={() => {
                depositMutation.mutate(
                  {
                    studentId,
                    data: {
                      amount: depositAmount,
                      payment_method: depositMethod,
                      notes: depositNotes || undefined,
                    },
                  },
                  { onSuccess: () => setDepositOpen(false) }
                );
              }}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                color: "var(--gold-fg)",
              }}
            >
              <Wallet className="h-4 w-4" />
              {depositMutation.isPending ? t("common.saving") : t("caja.confirmDeposit")}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Admin: Password Reset Dialog */}
      <Dialog
        open={pwdResetOpen}
        onClose={() => setPwdResetOpen(false)}
        title="Resetear Contraseña"
        description={`Genera una nueva contraseña para ${student.full_name}`}
      >
        {!pwdResult ? (
          <div className="space-y-5">
            {/* Custom vs auto password */}
            <div className="rounded-xl border border-[--gold-bd] bg-[--gold-bg] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[--gold] mb-3">Contraseña</p>

              <label className="flex items-start gap-3 rounded-lg p-3 cursor-pointer hover:bg-[--bg-muted]/50 transition-colors">
                <input
                  type="radio"
                  name="pwd-source"
                  checked={pwdCustomMode}
                  onChange={() => setPwdCustomMode(true)}
                  className="mt-0.5 accent-[--gold]"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[--tx-primary]">Escribir contraseña</p>
                  <p className="text-xs text-[--tx-muted]">
                    Tú eliges la contraseña — ideal para que sea fácil de recordar.
                    <span className="ml-1 font-medium text-[--gold]">Recomendado para personas mayores.</span>
                  </p>
                  {pwdCustomMode && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type={pwdVisible ? "text" : "password"}
                        value={pwdCustomValue}
                        onChange={(e) => setPwdCustomValue(e.target.value)}
                        placeholder="Ej: FitnessRoom2024"
                        className="flex-1 rounded-lg border border-[--bd-default] bg-[--bg-base] px-3 py-2 text-sm text-[--tx-primary] placeholder:text-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-1 focus:ring-[--gold]"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setPwdVisible(!pwdVisible)}
                        className="rounded-lg border border-[--bd-subtle] p-2 text-[--tx-muted] hover:text-[--tx-primary] transition-colors"
                      >
                        {pwdVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg p-3 cursor-pointer hover:bg-[--bg-muted]/50 transition-colors">
                <input
                  type="radio"
                  name="pwd-source"
                  checked={!pwdCustomMode}
                  onChange={() => setPwdCustomMode(false)}
                  className="mt-0.5 accent-[--gold]"
                />
                <div>
                  <p className="text-sm font-semibold text-[--tx-primary]">Generar automáticamente</p>
                  <p className="text-xs text-[--tx-muted]">
                    Se generará una contraseña segura aleatoria.
                  </p>
                </div>
              </label>
            </div>

            {/* Permanent vs temp */}
            <div className="rounded-xl border border-[--bd-subtle] bg-[--bg-muted] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[--tx-disabled] mb-3">Tipo</p>

              <label className="flex items-center gap-3 rounded-lg p-2 cursor-pointer">
                <input
                  type="radio"
                  name="pwd-type"
                  checked={pwdPermanent}
                  onChange={() => setPwdPermanent(true)}
                  className="accent-[--gold]"
                />
                <div>
                  <p className="text-sm font-medium text-[--tx-primary]">Permanente <span className="text-xs text-[--gold]">(recomendado)</span></p>
                  <p className="text-xs text-[--tx-muted]">Inicia sesión directamente, sin tener que cambiarla.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-lg p-2 cursor-pointer">
                <input
                  type="radio"
                  name="pwd-type"
                  checked={!pwdPermanent}
                  onChange={() => setPwdPermanent(false)}
                  className="accent-[--gold]"
                />
                <div>
                  <p className="text-sm font-medium text-[--tx-primary]">Temporal</p>
                  <p className="text-xs text-[--tx-muted]">Deberá cambiarla en su primer inicio de sesión.</p>
                </div>
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-[--bd-subtle] bg-[--bg-muted] p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={pwdSendEmail}
                onChange={(e) => setPwdSendEmail(e.target.checked)}
                className="h-4 w-4 rounded accent-[--gold]"
              />
              <div>
                <p className="text-sm font-medium text-[--tx-primary]">También enviar por email</p>
                <p className="text-xs text-[--tx-muted]">Se enviará la contraseña al correo {student.email}</p>
              </div>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPwdResetOpen(false)}
                className="rounded-xl border border-[--bd-subtle] px-5 py-2.5 text-sm font-medium text-[--tx-muted] transition-colors hover:border-[--bd-default] hover:text-[--tx-primary]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={adminResetPwd.isPending || (pwdCustomMode && pwdCustomValue.length < 6)}
                onClick={() => {
                  adminResetPwd.mutate(
                    {
                      studentId,
                      permanent: pwdPermanent,
                      sendEmail: pwdSendEmail,
                      customPassword: pwdCustomMode ? pwdCustomValue : undefined,
                    },
                    { onSuccess: (res) => setPwdResult(res) },
                  );
                }}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                  boxShadow: "0 10px 25px var(--gold-bg)",
                }}
              >
                {adminResetPwd.isPending ? "Guardando..." : "Establecer Contraseña"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border-2 border-[--color-success-bd] bg-[--color-success-bg] p-5 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-[--color-success]" />
              <p className="text-sm font-semibold text-[--tx-primary]">
                {pwdResult.permanent ? "Contraseña permanente generada" : "Contraseña temporal generada"}
              </p>
              <p className="mt-1 text-xs text-[--tx-muted]">{pwdResult.message}</p>
            </div>

            <div className="rounded-xl border border-[--bd-default] bg-[--bg-muted] p-4">
              <p className="mb-2 text-xs font-medium text-[--tx-disabled] uppercase tracking-wider">Nueva Contraseña</p>
              <div className="flex items-center gap-3">
                <code className="flex-1 rounded-lg bg-[--bg-base] px-4 py-3 text-lg font-mono font-bold text-[--tx-primary] tracking-widest select-all">
                  {pwdVisible ? pwdResult.password : "••••••••••••"}
                </code>
                <button
                  onClick={() => setPwdVisible(!pwdVisible)}
                  className="rounded-lg border border-[--bd-subtle] p-2.5 text-[--tx-muted] hover:text-[--tx-primary] transition-colors"
                  title={pwdVisible ? "Ocultar" : "Mostrar"}
                >
                  {pwdVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(pwdResult.password);
                    toast.success("Contraseña copiada al portapapeles");
                  }}
                  className="rounded-lg border border-[--bd-subtle] p-2.5 text-[--tx-muted] hover:text-[--tx-primary] transition-colors"
                  title="Copiar"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
            </div>

            {pwdResult.email_sent && (
              <div className="flex items-center gap-2 rounded-xl bg-[--color-info-bg] px-4 py-3 text-sm text-[--color-info]">
                <MailIcon className="h-4 w-4" />
                Contraseña enviada por email a {student.email}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setPwdResetOpen(false);
                  setPwdResult(null);
                }}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                  boxShadow: "0 10px 25px var(--gold-bg)",
                }}
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "emerald" | "blue" | "slate";
}): React.JSX.Element {
  const border = { emerald: "border-[--color-success-bd] bg-[--color-success-bg]", blue: "border-[--color-info-bd] bg-[--color-info-bg]", slate: "border-[--bd-subtle] bg-[--bg-muted]/50" }[color];
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-5 ${border}`}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs text-[--tx-disabled]">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold text-[--tx-primary]">{value}</p>
        <p className="truncate text-xs text-[--tx-disabled]">{sub}</p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={className}>
      <dt className="text-xs text-[--tx-disabled]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[--tx-primary]">{value}</dd>
    </div>
  );
}

export { InfoRow };
