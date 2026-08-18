/** Membership Plans admin page — CRUD for admin-configurable plans. */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Clock,
  Users2,
  CalendarDays,
  Ban,
  Sparkles,
  Trash2,
  Download,
} from "lucide-react";
import {
  useMembershipPlans,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
  useSeedPlans,
} from "@/hooks/useMembershipPlans";
import type {
  MembershipPlan,
  CreatePlanRequest,
  UpdatePlanRequest,
  BlockedSchedule,
  DayAbbr,
} from "@/types/membershipPlan";
import { VALID_DAYS, DAY_LABELS, DAY_SHORT_LABELS } from "@/types/membershipPlan";

export const Route = createFileRoute("/membership-plans/")({
  component: MembershipPlansPage,
});

// ── Styles ──────────────────────────────────────────────────────────────────

const cardCls =
  "rounded-2xl border border-[--bd-subtle] bg-[--bg-surface] p-5 transition-all hover:border-[--gold-bd]/50";
const btnPrimary =
  "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98]";
const btnSecondary =
  "inline-flex items-center gap-2 rounded-xl border border-[--bd-subtle] bg-[--bg-muted] px-4 py-2.5 text-sm font-medium text-[--tx-secondary] transition-all hover:bg-[--bg-muted]/80";
const inputCls =
  "w-full rounded-xl border border-[--bd-subtle] bg-[--bg-base] px-3 py-2 text-sm text-[--tx-primary] outline-none focus:border-[--gold] focus:ring-1 focus:ring-[--gold]";
const labelCls = "block text-xs font-semibold text-[--tx-muted] mb-1";

// ── Page ────────────────────────────────────────────────────────────────────

function MembershipPlansPage(): React.JSX.Element {
  const { data: plans, isLoading } = useMembershipPlans(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const seedPlans = useSeedPlans();

  function openCreate(): void {
    setEditingPlan(null);
    setShowModal(true);
  }

  function openEdit(plan: MembershipPlan): void {
    setEditingPlan(plan);
    setShowModal(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--tx-primary]">
            Planes de Membresía
          </h1>
          <p className="mt-1 text-sm text-[--tx-muted]">
            Administra los tipos de membresía, precios, restricciones de horario y más.
          </p>
        </div>
        <div className="flex gap-2">
          {(!plans || plans.length === 0) && (
            <button
              className={btnSecondary}
              onClick={() => seedPlans.mutate()}
              disabled={seedPlans.isPending}
            >
              {seedPlans.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Inicializar planes
            </button>
          )}
          <button
            className={btnPrimary}
            style={{
              background:
                "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
              color: "var(--gold-fg)",
              boxShadow: "var(--shadow-gold)",
            }}
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            Nuevo plan
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[--gold]" />
        </div>
      )}

      {/* ── Plans grid ── */}
      {plans && plans.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.slug} plan={plan} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {plans && plans.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[--bd-subtle] py-20">
          <CalendarDays className="h-12 w-12 text-[--tx-disabled] mb-4" />
          <p className="text-lg font-semibold text-[--tx-muted]">
            No hay planes configurados
          </p>
          <p className="mt-1 text-sm text-[--tx-disabled]">
            Haz clic en &quot;Inicializar planes&quot; para crear los planes
            predeterminados.
          </p>
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <PlanModal
          plan={editingPlan}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ── Plan Card ───────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onEdit,
}: {
  plan: MembershipPlan;
  onEdit: (plan: MembershipPlan) => void;
}): React.JSX.Element {
  const updatePlan = useUpdatePlan();

  function toggleActive(): void {
    updatePlan.mutate({
      slug: plan.slug,
      data: { is_active: !plan.is_active },
    });
  }

  return (
    <div
      className={`${cardCls} ${!plan.is_active ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-[--tx-primary]">
            {plan.label}
          </h3>
          {plan.description && (
            <p className="mt-0.5 text-xs text-[--tx-muted]">
              {plan.description}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(plan)}
            className="rounded-lg p-1.5 text-[--tx-muted] hover:bg-[--bg-muted] hover:text-[--tx-primary] transition"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={toggleActive}
            className="rounded-lg p-1.5 text-[--tx-muted] hover:bg-[--bg-muted] hover:text-[--tx-primary] transition"
            title={plan.is_active ? "Desactivar" : "Activar"}
            disabled={updatePlan.isPending}
          >
            {plan.is_active ? (
              <ToggleRight className="h-4 w-4 text-[--color-success]" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-[--tx-muted]">
          <span className="font-mono font-bold text-[--gold] text-sm">
            ${plan.default_price.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[--tx-muted]">
          <Clock className="h-3.5 w-3.5" />
          {plan.duration_days} días
        </div>
        <div className="flex items-center gap-1.5 text-[--tx-muted]">
          <CalendarDays className="h-3.5 w-3.5" />
          {plan.sessions_per_day === 0 ? "Ilimitado" : `${plan.sessions_per_day}/día`}
        </div>
        {plan.requires_partner && (
          <div className="flex items-center gap-1.5 text-[--gold]">
            <Users2 className="h-3.5 w-3.5" />
            Dúo
          </div>
        )}
        {plan.total_sessions !== null && (
          <div className="flex items-center gap-1.5 text-[--tx-muted]">
            <Sparkles className="h-3.5 w-3.5" />
            {plan.total_sessions} sesiones
          </div>
        )}
      </div>

      {/* Days */}
      <div className="mt-3 flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase text-[--tx-disabled]">
          Días:
        </span>
        <div className="flex gap-0.5">
          {(VALID_DAYS as readonly string[]).map((d) => (
            <span
              key={d}
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                plan.allowed_days.includes(d)
                  ? "bg-[--gold-bg] text-[--gold] border border-[--gold-bd]"
                  : "bg-[--bg-muted] text-[--tx-disabled] line-through"
              }`}
            >
              {DAY_SHORT_LABELS[d as DayAbbr]}
            </span>
          ))}
        </div>
      </div>

      {/* Blocked schedules */}
      {plan.blocked_schedules.length > 0 && (
        <div className="mt-2 space-y-1">
          <span className="text-[10px] font-semibold uppercase text-[--tx-disabled]">
            Bloqueados:
          </span>
          {plan.blocked_schedules.map((bs, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-[10px] text-[--color-danger]"
            >
              <Ban className="h-3 w-3" />
              {DAY_LABELS[bs.day as DayAbbr]} {bs.start}–{bs.end}
            </div>
          ))}
        </div>
      )}

      {/* Slug badge */}
      <div className="mt-3 pt-2 border-t border-[--bd-subtle]">
        <span className="rounded-md bg-[--bg-muted] px-2 py-0.5 font-mono text-[10px] text-[--tx-disabled]">
          {plan.slug}
        </span>
      </div>
    </div>
  );
}

// ── Create / Edit Modal ─────────────────────────────────────────────────────

function PlanModal({
  plan,
  onClose,
}: {
  plan: MembershipPlan | null;
  onClose: () => void;
}): React.JSX.Element {
  const isEdit = plan !== null;
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const [label, setLabel] = useState(plan?.label ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [defaultPrice, setDefaultPrice] = useState(plan?.default_price ?? 0);
  const [durationDays, setDurationDays] = useState(plan?.duration_days ?? 30);
  const [sessionsPerDay, setSessionsPerDay] = useState(plan?.sessions_per_day ?? 1);
  const [totalSessions, setTotalSessions] = useState<number | "">(
    plan?.total_sessions ?? "",
  );
  const [allowedDays, setAllowedDays] = useState<string[]>(
    plan?.allowed_days ?? ["mon", "tue", "wed", "thu", "fri", "sat"],
  );
  const [blockedSchedules, setBlockedSchedules] = useState<BlockedSchedule[]>(
    plan?.blocked_schedules ?? [],
  );
  const [requiresPartner, setRequiresPartner] = useState(plan?.requires_partner ?? false);
  const [sortOrder, setSortOrder] = useState(plan?.sort_order ?? 0);

  function toggleDay(day: string): void {
    setAllowedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function addBlockedSchedule(): void {
    setBlockedSchedules((prev) => [
      ...prev,
      { day: "mon", start: "07:00", end: "08:00" },
    ]);
  }

  function updateBlockedSchedule(
    index: number,
    field: keyof BlockedSchedule,
    value: string,
  ): void {
    setBlockedSchedules((prev) =>
      prev.map((bs, i) => (i === index ? { ...bs, [field]: value } : bs)),
    );
  }

  function removeBlockedSchedule(index: number): void {
    setBlockedSchedules((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!label.trim()) return;

    if (isEdit) {
      const data: UpdatePlanRequest = {
        label,
        description,
        default_price: defaultPrice,
        duration_days: durationDays,
        sessions_per_day: sessionsPerDay,
        total_sessions: totalSessions === "" ? undefined : totalSessions,
        clear_total_sessions: totalSessions === "",
        allowed_days: allowedDays,
        blocked_schedules: blockedSchedules,
        requires_partner: requiresPartner,
        sort_order: sortOrder,
      };
      updatePlan.mutate(
        { slug: plan.slug, data },
        { onSuccess: onClose },
      );
    } else {
      const data: CreatePlanRequest = {
        label,
        description,
        default_price: defaultPrice,
        duration_days: durationDays,
        sessions_per_day: sessionsPerDay,
        total_sessions: totalSessions === "" ? undefined : totalSessions,
        allowed_days: allowedDays,
        blocked_schedules: blockedSchedules,
        requires_partner: requiresPartner,
        sort_order: sortOrder,
      };
      createPlan.mutate(data, { onSuccess: onClose });
    }
  }

  function handleDelete(): void {
    if (!plan) return;
    if (!window.confirm(`¿Desactivar el plan "${plan.label}"?`)) return;
    deletePlan.mutate(plan.slug, { onSuccess: onClose });
  }

  const isPending = createPlan.isPending || updatePlan.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[--bd-subtle] bg-[--bg-surface] shadow-2xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[--bd-subtle] px-6 py-4">
            <h2 className="text-lg font-bold text-[--tx-primary]">
              {isEdit ? `Editar: ${plan.label}` : "Nuevo Plan"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[--tx-muted] hover:bg-[--bg-muted]"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 px-6 py-5">
            {/* Label + Description */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nombre *</label>
                <input
                  className={inputCls}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Room Daily"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Orden</label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Descripción</label>
              <input
                className={inputCls}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="1 sesión/día de lunes a sábado"
              />
            </div>

            {/* Price, Duration, Sessions */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Precio (MXN)</label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  step={50}
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(Number(e.target.value))}
                />
              </div>
              <div>
                <label className={labelCls}>Duración (días)</label>
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  max={365}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                />
              </div>
              <div>
                <label className={labelCls}>Sesiones/día</label>
                <input
                  className={inputCls}
                  type="number"
                  min={0}
                  max={10}
                  value={sessionsPerDay}
                  onChange={(e) => setSessionsPerDay(Number(e.target.value))}
                />
                <span className="text-[10px] text-[--tx-disabled]">
                  0 = ilimitado
                </span>
              </div>
            </div>

            {/* Total sessions (for packs) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Total sesiones (paquete)</label>
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  value={totalSessions}
                  onChange={(e) =>
                    setTotalSessions(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  placeholder="Vacío = ilimitado"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresPartner}
                    onChange={(e) => setRequiresPartner(e.target.checked)}
                    className="h-4 w-4 rounded border-[--bd-subtle] accent-[--gold]"
                  />
                  <span className="text-sm font-medium text-[--tx-secondary]">
                    Plan Dúo (requiere pareja)
                  </span>
                </label>
              </div>
            </div>

            {/* Allowed Days */}
            <div>
              <label className={labelCls}>Días permitidos</label>
              <div className="flex gap-1.5 mt-1">
                {(VALID_DAYS as readonly string[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      allowedDays.includes(d)
                        ? "bg-[--gold-bg] text-[--gold] border border-[--gold-bd]"
                        : "bg-[--bg-muted] text-[--tx-disabled] border border-transparent hover:border-[--bd-subtle]"
                    }`}
                  >
                    {DAY_LABELS[d as DayAbbr]}
                  </button>
                ))}
              </div>
            </div>

            {/* Blocked Schedules */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls}>Horarios bloqueados</label>
                <button
                  type="button"
                  onClick={addBlockedSchedule}
                  className="text-xs text-[--gold] hover:underline font-semibold"
                >
                  + Agregar bloqueo
                </button>
              </div>
              {blockedSchedules.length === 0 && (
                <p className="text-xs text-[--tx-disabled]">
                  Sin bloqueos — el alumno puede reservar cualquier horario en los días permitidos.
                </p>
              )}
              <div className="space-y-2 mt-1">
                {blockedSchedules.map((bs, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl border border-[--bd-subtle] bg-[--bg-base] p-2"
                  >
                    <select
                      className={`${inputCls} w-auto`}
                      value={bs.day}
                      onChange={(e) =>
                        updateBlockedSchedule(i, "day", e.target.value)
                      }
                    >
                      {(VALID_DAYS as readonly string[]).map((d) => (
                        <option key={d} value={d}>
                          {DAY_LABELS[d as DayAbbr]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      className={`${inputCls} w-auto`}
                      value={bs.start}
                      onChange={(e) =>
                        updateBlockedSchedule(i, "start", e.target.value)
                      }
                    />
                    <span className="text-xs text-[--tx-muted]">a</span>
                    <input
                      type="time"
                      className={`${inputCls} w-auto`}
                      value={bs.end}
                      onChange={(e) =>
                        updateBlockedSchedule(i, "end", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeBlockedSchedule(i)}
                      className="rounded-lg p-1 text-[--color-danger] hover:bg-[--color-danger-bg]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[--bd-subtle] px-6 py-4">
            <div>
              {isEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-sm text-[--color-danger] hover:underline"
                  disabled={deletePlan.isPending}
                >
                  Desactivar plan
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className={btnSecondary}>
                Cancelar
              </button>
              <button
                type="submit"
                className={btnPrimary}
                style={{
                  background:
                    "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                  color: "var(--gold-fg)",
                  boxShadow: "var(--shadow-gold)",
                }}
                disabled={isPending || !label.trim()}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEdit ? (
                  "Guardar"
                ) : (
                  "Crear plan"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
