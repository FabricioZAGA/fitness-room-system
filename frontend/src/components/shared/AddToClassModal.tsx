/**
 * Modal for adding a member, day-pass visitor, or courtesy to a class.
 * Tabs: Socio | Visita 1 día | Cortesía
 */

import { useState, useMemo } from "react";
import { Dialog } from "./Dialog";
import { useStudents } from "@/hooks/useStudents";
import { useCreateReservation } from "@/hooks/useReservations";
import { Search, User, CheckCircle2, Clock, UserPlus, Gift } from "lucide-react";
import type { Student } from "@/types/student";
import type { FitnessClass } from "@/types/class";
import type { ReservationType } from "@/types/reservation";
import { RESERVATION_TYPE_LABELS } from "@/types/reservation";
import { getClassTypeLabel } from "@/types/class";
import { useClassTypes } from "@/hooks/useCatalogs";
import { formatDate, formatTime } from "@/lib/utils";

interface AddToClassModalProps {
  open: boolean;
  onClose: () => void;
  selectedClass: FitnessClass | null;
}

const goldActiveStyle = {
  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
  color: "var(--gold-fg)",
} as const;

const inputCls =
  "w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";

export function AddToClassModal({
  open,
  onClose,
  selectedClass,
}: AddToClassModalProps): React.JSX.Element {
  const [reservationType, setReservationType] = useState<ReservationType>("member");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [step, setStep] = useState<"search" | "confirm">("search");
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");

  const { data: studentsData } = useStudents({ status: "active", limit: 100 });
  const { mutate: createReservation, isPending } = useCreateReservation();
  const { data: classTypes = [] } = useClassTypes();

  const filteredStudents = useMemo(() => {
    const allStudents = studentsData?.items ?? [];
    if (searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return allStudents
      .filter(
        (s) =>
          s.full_name.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [studentsData, searchTerm]);

  function handleSelectStudent(student: Student): void {
    setSelectedStudent(student);
    setStep("confirm");
  }

  function handleConfirm(): void {
    if (!selectedClass) return;

    if (reservationType === "member") {
      if (!selectedStudent) return;
      createReservation(
        {
          class_id: selectedClass.class_id,
          student_id: selectedStudent.student_id,
          reservation_type: "member",
        },
        { onSuccess: () => handleClose() }
      );
    } else {
      if (!visitorName.trim()) return;
      createReservation(
        {
          class_id: selectedClass.class_id,
          student_id: `visitor_placeholder`,
          reservation_type: reservationType,
          visitor_name: visitorName.trim(),
          visitor_phone: visitorPhone.trim() || undefined,
        },
        { onSuccess: () => handleClose() }
      );
    }
  }

  function handleClose(): void {
    setSearchTerm("");
    setSelectedStudent(null);
    setStep("search");
    setVisitorName("");
    setVisitorPhone("");
    setReservationType("member");
    onClose();
  }

  function handleBack(): void {
    setSelectedStudent(null);
    setStep("search");
  }

  if (!selectedClass) return <></>;

  const spotsAvailable = selectedClass.available_spots > 0;
  const isVisitor = reservationType !== "member";

  const typeTabs: { id: ReservationType; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "member", icon: User },
    { id: "day_pass", icon: UserPlus },
    { id: "courtesy", icon: Gift },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Añadir a Clase"
      description={`${getClassTypeLabel(selectedClass.class_type, classTypes)} · ${selectedClass.instructor_name}`}
    >
      {/* Class Info Banner */}
      <div className="mb-4 rounded-xl border border-[--bd-subtle] bg-[--bg-muted]/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[--tx-primary]">
              {getClassTypeLabel(selectedClass.class_type, classTypes)}
            </p>
            <p className="text-sm text-[--tx-muted]">
              {formatDate(selectedClass.class_date)} · {formatTime(selectedClass.start_time)}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-lg font-bold ${
                spotsAvailable ? "text-[--color-success]" : "text-[--color-warning]"
              }`}
            >
              {selectedClass.available_spots}/{selectedClass.capacity}
            </p>
            <p className="text-xs text-[--tx-disabled]">
              {spotsAvailable ? "lugares disponibles" : "lista de espera"}
            </p>
          </div>
        </div>
      </div>

      {/* Reservation type tabs */}
      <div className="mb-5 flex rounded-xl border border-[--bd-default] bg-[--bg-muted] p-1">
        {typeTabs.map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setReservationType(id);
              setStep("search");
              setSelectedStudent(null);
              setVisitorName("");
              setVisitorPhone("");
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all"
            style={reservationType === id ? goldActiveStyle : { color: "var(--tx-muted)" }}
          >
            <Icon className="h-3.5 w-3.5" />
            {RESERVATION_TYPE_LABELS[id]}
          </button>
        ))}
      </div>

      {/* MEMBER: search & select flow */}
      {!isVisitor && step === "search" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[--tx-disabled]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar miembro por nombre o email..."
              autoFocus
              className="w-full rounded-xl border-2 border-[--bd-subtle] bg-[--bg-muted] py-4 pl-12 pr-4 text-base text-[--tx-primary] placeholder-[--tx-disabled] transition-colors focus:border-[--gold] focus:outline-none"
            />
          </div>

          {searchTerm.length >= 2 && (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="py-6 text-center text-[--tx-disabled]">
                  No se encontraron miembros
                </p>
              ) : (
                filteredStudents.map((student) => (
                  <button
                    key={student.student_id}
                    onClick={() => handleSelectStudent(student)}
                    className="flex w-full items-center gap-4 rounded-xl border-2 border-[--bd-subtle] bg-[--bg-muted] p-4 text-left transition-all hover:border-[--gold]/50 hover:bg-[--bg-muted]/80"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[--color-success-bg] text-sm font-bold text-[--color-success]">
                      {student.first_name.charAt(0)}
                      {student.last_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[--tx-primary]">{student.full_name}</p>
                      <p className="text-sm text-[--tx-muted]">{student.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {searchTerm.length < 2 && (
            <div className="rounded-xl bg-[--bg-muted]/30 py-10 text-center">
              <User className="mx-auto mb-3 h-10 w-10 text-[--tx-disabled]" />
              <p className="text-[--tx-disabled]">
                Escribe al menos 2 caracteres para buscar
              </p>
            </div>
          )}
        </div>
      )}

      {/* MEMBER: confirm step */}
      {!isVisitor && step === "confirm" && selectedStudent && (
        <div className="space-y-6">
          <div className="rounded-xl border-2 border-[--color-success-bd] bg-[--color-success-bg] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[--color-success-bg] text-lg font-bold text-[--color-success]">
                {selectedStudent.first_name.charAt(0)}
                {selectedStudent.last_name.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-semibold text-[--tx-primary]">
                  {selectedStudent.full_name}
                </p>
                <p className="text-sm text-[--tx-muted]">{selectedStudent.email}</p>
              </div>
            </div>
          </div>

          <SpotIndicator spotsAvailable={spotsAvailable} />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 rounded-xl border-2 border-[--bd-subtle] py-4 text-base font-medium text-[--tx-muted] transition-colors hover:border-[--bd-default] hover:text-[--tx-primary]"
            >
              Cambiar miembro
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1 rounded-xl py-4 text-base font-semibold transition-all disabled:opacity-50"
              style={{ ...goldActiveStyle, boxShadow: "0 10px 25px var(--gold-bg)" }}
            >
              {isPending
                ? "Guardando..."
                : spotsAvailable
                  ? "Confirmar Reservación"
                  : "Añadir a Lista de Espera"}
            </button>
          </div>
        </div>
      )}

      {/* VISITOR (day_pass / courtesy) form */}
      {isVisitor && (
        <div className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                Nombre del visitante *
              </label>
              <input
                type="text"
                className={inputCls}
                placeholder="Nombre completo"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[--tx-muted]">
                Teléfono (opcional)
              </label>
              <input
                type="tel"
                className={inputCls}
                placeholder="10 dígitos"
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
              />
            </div>
          </div>

          {reservationType === "day_pass" && (
            <div className="rounded-xl border border-[--gold-bd] bg-[--gold-bg] p-3">
              <p className="text-xs font-medium text-[--gold]">
                Se registrará como visita de 1 día (pase diario)
              </p>
            </div>
          )}
          {reservationType === "courtesy" && (
            <div className="rounded-xl border border-[--color-info-bd] bg-[--color-info-bg] p-3">
              <p className="text-xs font-medium text-[--color-info]">
                Se registrará como cortesía (sin costo)
              </p>
            </div>
          )}

          <SpotIndicator spotsAvailable={spotsAvailable} />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-xl border-2 border-[--bd-subtle] py-4 text-base font-medium text-[--tx-muted] transition-colors hover:border-[--bd-default] hover:text-[--tx-primary]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending || !visitorName.trim()}
              className="flex-1 rounded-xl py-4 text-base font-semibold transition-all disabled:opacity-50"
              style={{ ...goldActiveStyle, boxShadow: "0 10px 25px var(--gold-bg)" }}
            >
              {isPending
                ? "Guardando..."
                : spotsAvailable
                  ? `Confirmar ${RESERVATION_TYPE_LABELS[reservationType]}`
                  : "Añadir a Lista de Espera"}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function SpotIndicator({ spotsAvailable }: { spotsAvailable: boolean }): React.JSX.Element {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl p-4 ${
        spotsAvailable
          ? "bg-[--color-success-bg] border border-[--color-success-bd]"
          : "bg-[--color-warning-bg] border border-[--color-warning-bd]"
      }`}
    >
      {spotsAvailable ? (
        <>
          <CheckCircle2 className="h-6 w-6 text-[--color-success]" />
          <div>
            <p className="font-medium text-[--color-success]">Reservación inmediata</p>
            <p className="text-sm text-[--color-success]/70">Hay lugares disponibles</p>
          </div>
        </>
      ) : (
        <>
          <Clock className="h-6 w-6 text-[--color-warning]" />
          <div>
            <p className="font-medium text-[--color-warning]">Lista de espera</p>
            <p className="text-sm text-[--color-warning]/70">Se agregará a la lista de espera</p>
          </div>
        </>
      )}
    </div>
  );
}
