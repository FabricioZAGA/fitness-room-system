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
    onError: () => {
      toast.error("Error al registrar el alumno. Intenta de nuevo.");
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
    onError: () => {
      toast.error("Error al actualizar el alumno.");
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
      qc.setQueryData([STUDENTS_KEY, student.student_id], student);
      toast.success("Alumno desactivado.");
    },
  });
}

export function useCheckin() {
  return useMutation({
    mutationFn: (studentId: string) => studentService.checkin(studentId),
    onSuccess: () => {
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

export function useStudentQr(studentId: string) {
  return useQuery({
    queryKey: [STUDENTS_KEY, studentId, "qr"],
    queryFn: () => studentService.getQr(studentId),
    enabled: Boolean(studentId),
    staleTime: 1000 * 60 * 60,
  });
}
