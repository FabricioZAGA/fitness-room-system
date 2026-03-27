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
  const allStudents = studentsData?.items ?? [];

  const { mutate: createReservation, isPending } = useCreateReservation();

  // Filter students by search term
  const filteredStudents = useMemo(() => {
    if (searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return allStudents
      .filter(
        (s) =>
          s.full_name.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [allStudents, searchTerm]);

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
      <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-white">
              {CLASS_TYPE_LABELS[selectedClass.class_type]}
            </p>
            <p className="text-sm text-slate-400">
              {formatDate(selectedClass.class_date)} · {formatTime(selectedClass.start_time)}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-lg font-bold ${
                spotsAvailable ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {selectedClass.available_spots}/{selectedClass.capacity}
            </p>
            <p className="text-xs text-slate-500">
              {spotsAvailable ? "lugares disponibles" : "lista de espera"}
            </p>
          </div>
        </div>
      </div>

      {step === "search" ? (
        /* Step 1: Search and select member */
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar miembro por nombre o email..."
              autoFocus
              className="w-full rounded-xl border-2 border-slate-700 bg-slate-800 py-4 pl-12 pr-4 text-base text-white placeholder-slate-500 transition-colors focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Search Results */}
          {searchTerm.length >= 2 && (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="py-6 text-center text-slate-500">
                  No se encontraron miembros
                </p>
              ) : (
                filteredStudents.map((student) => (
                  <button
                    key={student.student_id}
                    onClick={() => handleSelectStudent(student)}
                    className="flex w-full items-center gap-4 rounded-xl border-2 border-slate-700 bg-slate-800 p-4 text-left transition-all hover:border-emerald-500/50 hover:bg-slate-800/80"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-400">
                      {student.first_name.charAt(0)}
                      {student.last_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{student.full_name}</p>
                      <p className="text-sm text-slate-400">{student.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {searchTerm.length < 2 && (
            <div className="rounded-xl bg-slate-800/30 py-10 text-center">
              <User className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-slate-500">
                Escribe al menos 2 caracteres para buscar
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Step 2: Confirm reservation */
        <div className="space-y-6">
          <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-lg font-bold text-emerald-400">
                {selectedStudent?.first_name.charAt(0)}
                {selectedStudent?.last_name.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  {selectedStudent?.full_name}
                </p>
                <p className="text-sm text-slate-400">{selectedStudent?.email}</p>
              </div>
            </div>
          </div>

          {/* Status indicator */}
          <div
            className={`flex items-center gap-3 rounded-xl p-4 ${
              spotsAvailable
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-amber-500/10 border border-amber-500/20"
            }`}
          >
            {spotsAvailable ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                <div>
                  <p className="font-medium text-emerald-400">
                    Reservación inmediata
                  </p>
                  <p className="text-sm text-emerald-400/70">
                    Hay lugares disponibles en esta clase
                  </p>
                </div>
              </>
            ) : (
              <>
                <Clock className="h-6 w-6 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-400">Lista de espera</p>
                  <p className="text-sm text-amber-400/70">
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
              className="flex-1 rounded-xl border-2 border-slate-700 py-4 text-base font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
            >
              Cambiar miembro
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1 rounded-xl bg-emerald-600 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 disabled:opacity-50"
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
