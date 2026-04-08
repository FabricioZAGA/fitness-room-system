/**
 * Modal for adding a member to a class (creating a reservation).
 * Allows searching and selecting a member, then confirms the reservation.
 */

import { useState, useMemo } from "react";
import { Dialog } from "./Dialog";
import { useStudents } from "@/hooks/useStudents";
import { useCreateReservation } from "@/hooks/useReservations";
import { Search, User, CheckCircle2, Clock } from "lucide-react";
import type { Student } from "@/types/student";
import type { FitnessClass } from "@/types/class";
import { CLASS_TYPE_LABELS } from "@/types/class";
import { formatDate, formatTime } from "@/lib/utils";

interface AddToClassModalProps {
  open: boolean;
  onClose: () => void;
  selectedClass: FitnessClass | null;
}

export function AddToClassModal({
  open,
  onClose,
  selectedClass,
}: AddToClassModalProps): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [step, setStep] = useState<"search" | "confirm">("search");

  const { data: studentsData } = useStudents({ status: "active", limit: 100 });
  const { mutate: createReservation, isPending } = useCreateReservation();

  // Filter students by search term
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
    if (!selectedClass || !selectedStudent) return;

    createReservation(
      {
        class_id: selectedClass.class_id,
        student_id: selectedStudent.student_id,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  }

  function handleClose(): void {
    setSearchTerm("");
    setSelectedStudent(null);
    setStep("search");
    onClose();
  }

  function handleBack(): void {
    setSelectedStudent(null);
    setStep("search");
  }

  if (!selectedClass) return <></>;

  const spotsAvailable = selectedClass.available_spots > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Añadir Miembro a Clase"
      description={`${CLASS_TYPE_LABELS[selectedClass.class_type]} · ${selectedClass.instructor_name}`}
    >
      {/* Class Info Banner */}
      <div className="mb-6 rounded-xl border border-[--bd-subtle] bg-[--bg-muted]/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[--tx-primary]">
              {CLASS_TYPE_LABELS[selectedClass.class_type]}
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

      {step === "search" ? (
        /* Step 1: Search and select member */
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

          {/* Search Results */}
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
      ) : (
        /* Step 2: Confirm reservation */
        <div className="space-y-6">
          <div className="rounded-xl border-2 border-[--color-success-bd] bg-[--color-success-bg] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[--color-success-bg] text-lg font-bold text-[--color-success]">
                {selectedStudent?.first_name.charAt(0)}
                {selectedStudent?.last_name.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-semibold text-[--tx-primary]">
                  {selectedStudent?.full_name}
                </p>
                <p className="text-sm text-[--tx-muted]">{selectedStudent?.email}</p>
              </div>
            </div>
          </div>

          {/* Status indicator */}
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
                  <p className="font-medium text-[--color-success]">
                    Reservación inmediata
                  </p>
                  <p className="text-sm text-[--color-success]/70">
                    Hay lugares disponibles en esta clase
                  </p>
                </div>
              </>
            ) : (
              <>
                <Clock className="h-6 w-6 text-[--color-warning]" />
                <div>
                  <p className="font-medium text-[--color-warning]">Lista de espera</p>
                  <p className="text-sm text-[--color-warning]/70">
                    Se agregará a la lista de espera
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
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
              style={{
                background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
                color: "var(--gold-fg)",
                boxShadow: "0 10px 25px var(--gold-bg)"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold-hover) 0%, var(--gold) 100%)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)"; }}
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
    </Dialog>
  );
}
