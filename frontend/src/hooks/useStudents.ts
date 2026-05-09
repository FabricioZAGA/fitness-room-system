/** TanStack Query hooks for the Students module. */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { PaginatedResponse } from "@/types/common";
import type {
  CreateStudentRequest,
  Student,
  StudentStatus,
  UpdateStudentRequest,
} from "@/types/student";
import { studentService } from "@/services/studentService";
import { reservationService } from "@/services/reservationService";
import { getApiErrorMessage } from "@/lib/apiError";

export const STUDENTS_KEY = "students";

export function useStudents(params?: {
  status?: StudentStatus;
  limit?: number;
}): UseQueryResult<PaginatedResponse<Student>> {
  return useQuery({
    queryKey: [STUDENTS_KEY, "list", params],
    queryFn: () => studentService.list(params),
  });
}

export function useStudent(studentId: string): UseQueryResult<Student> {
  return useQuery({
    queryKey: [STUDENTS_KEY, studentId],
    queryFn: () => studentService.getById(studentId),
    enabled: Boolean(studentId),
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStudentRequest) => studentService.create(data),
    onSuccess: (student) => {
      qc.invalidateQueries({ queryKey: [STUDENTS_KEY] });
      toast.success(`Alumno ${student.full_name} registrado exitosamente.`);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Error al registrar el alumno. Intenta de nuevo."));
    },
  });
}

export function useUpdateStudent(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateStudentRequest) =>
      studentService.update(studentId, data),
    onSuccess: (student) => {
      qc.invalidateQueries({ queryKey: [STUDENTS_KEY] });
      qc.setQueryData([STUDENTS_KEY, studentId], student);
      toast.success("Perfil actualizado.");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Error al actualizar el alumno."));
    },
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => studentService.delete(studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [STUDENTS_KEY] });
      toast.success("Alumno eliminado.");
    },
    onError: () => {
      toast.error("Error al eliminar el alumno.");
    },
  });
}

export function useActivateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => studentService.activate(studentId),
    onSuccess: (student) => {
      qc.invalidateQueries({ queryKey: [STUDENTS_KEY] });
      qc.setQueryData([STUDENTS_KEY, student.student_id], student);
      toast.success("Alumno activado.");
    },
  });
}

export function useDeactivateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => studentService.deactivate(studentId),
    onSuccess: (student) => {
      qc.invalidateQueries({ queryKey: [STUDENTS_KEY] });
      qc.invalidateQueries({ queryKey: ["memberships"] });
      qc.setQueryData([STUDENTS_KEY, student.student_id], student);
      toast.success("Miembro desactivado. Su membresía fue cancelada.");
    },
  });
}

export function useSuspendStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => studentService.suspend(studentId),
    onSuccess: (student) => {
      qc.invalidateQueries({ queryKey: [STUDENTS_KEY] });
      qc.invalidateQueries({ queryKey: ["memberships"] });
      qc.setQueryData([STUDENTS_KEY, student.student_id], student);
      toast.success("Miembro suspendido. Su membresía fue congelada.");
    },
  });
}

export function useUnsuspendStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => studentService.unsuspend(studentId),
    onSuccess: (student) => {
      qc.invalidateQueries({ queryKey: [STUDENTS_KEY] });
      qc.invalidateQueries({ queryKey: ["memberships"] });
      qc.setQueryData([STUDENTS_KEY, student.student_id], student);
      toast.success("Miembro reactivado. Su membresía fue descongelada.");
    },
  });
}

export function useCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) => studentService.checkin(studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [STUDENTS_KEY] });
      toast.success("✓ Check-in registrado exitosamente.");
    },
    onError: () => {
      toast.error("Error al registrar el check-in. Verifica la conexión.");
    },
  });
}

/** Check-in + mark class attendance in one action. */
export function useCheckinWithAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      classId,
    }: {
      studentId: string;
      classId: string;
    }) => {
      const [checkinResult] = await Promise.all([
        studentService.checkin(studentId),
        reservationService.markAttendance(classId, studentId, true),
      ]);
      return checkinResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations"] });
      toast.success("✓ Check-in y asistencia registrados.");
    },
    onError: () => {
      toast.error("Error al registrar el check-in.");
    },
  });
}

export function useUploadStudentPhoto(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageBase64: string) =>
      studentService.uploadPhoto(studentId, imageBase64),
    onSuccess: (student) => {
      qc.invalidateQueries({ queryKey: [STUDENTS_KEY] });
      qc.setQueryData([STUDENTS_KEY, studentId], student);
      toast.success("Foto de perfil actualizada.");
    },
    onError: () => {
      toast.error("Error al subir la foto.");
    },
  });
}

export function useResendWelcome() {
  return useMutation({
    mutationFn: (studentId: string) => studentService.resendWelcome(studentId),
    onSuccess: (res) => {
      if (res.delivery_status === "sent") {
        toast.success("Email de bienvenida + carta responsiva reenviado.");
      } else {
        toast.warning(`No se pudo enviar: ${res.delivery_detail ?? res.message}`);
      }
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Error al reenviar email de bienvenida."));
    },
  });
}

export function useResendCredentials() {
  return useMutation({
    mutationFn: ({
      studentId,
      skipPasswordChange = false,
    }: {
      studentId: string;
      skipPasswordChange?: boolean;
    }) => studentService.resendCredentials(studentId, skipPasswordChange),
    onSuccess: (res) => {
      if (res.delivery_status === "sent") {
        toast.success("Credenciales del portal reenviadas.");
      } else {
        toast.warning(`No se pudo enviar: ${res.delivery_detail ?? res.message}`);
      }
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Error al reenviar credenciales."));
    },
  });
}

export function useUpdateContact(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email?: string;
      phone?: string;
      skip_password_change?: boolean;
      resend_all?: boolean;
    }) => studentService.updateContact(studentId, data),
    onSuccess: (student) => {
      qc.invalidateQueries({ queryKey: [STUDENTS_KEY] });
      qc.setQueryData([STUDENTS_KEY, studentId], student);
      toast.success("Datos de contacto actualizados y sincronizados con Cognito.");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Error al actualizar datos de contacto."));
    },
  });
}

export function useStudentQr(studentId: string) {
  return useQuery({
    queryKey: [STUDENTS_KEY, studentId, "qr"],
    queryFn: () => studentService.getQr(studentId),
    enabled: Boolean(studentId),
    staleTime: 1000 * 60 * 60,
  });
}
