/** TanStack Query hooks for the Notifications module. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  BulkNotificationResult,
  NotificationResponse,
  SendBulkRequest,
  SendCustomRequest,
} from "@/types/notification";
import { notificationService } from "@/services/notificationService";

const NOTIF_KEY = "notifications";

export function useRecentNotifications(limit = 50) {
  return useQuery({
    queryKey: [NOTIF_KEY, "recent", limit],
    queryFn: () => notificationService.listRecent(limit),
  });
}

export function useSendExpiryReminders() {
  const qc = useQueryClient();
  return useMutation<BulkNotificationResult, Error, SendBulkRequest | undefined>({
    mutationFn: (params) => notificationService.sendExpiryReminders(params),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [NOTIF_KEY] });
      toast.success(`${data.sent} recordatorio${data.sent !== 1 ? "s" : ""} enviado${data.sent !== 1 ? "s" : ""}${data.failed > 0 ? ` · ${data.failed} fallido${data.failed !== 1 ? "s" : ""}` : ""}`);
    },
    onError: () => toast.error("Error al enviar recordatorios"),
  });
}

export function useSendInactivityAlerts() {
  const qc = useQueryClient();
  return useMutation<BulkNotificationResult, Error, SendBulkRequest | undefined>({
    mutationFn: (params) => notificationService.sendInactivityAlerts(params),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [NOTIF_KEY] });
      toast.success(`${data.sent} alerta${data.sent !== 1 ? "s" : ""} enviada${data.sent !== 1 ? "s" : ""}${data.failed > 0 ? ` · ${data.failed} fallida${data.failed !== 1 ? "s" : ""}` : ""}`);
    },
    onError: () => toast.error("Error al enviar alertas"),
  });
}

export function useSendCustomNotification() {
  const qc = useQueryClient();
  return useMutation<
    NotificationResponse,
    Error,
    { studentId: string; data: SendCustomRequest }
  >({
    mutationFn: ({ studentId, data }) => notificationService.sendCustom(studentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTIF_KEY] });
      toast.success("Notificación enviada");
    },
    onError: () => toast.error("Error al enviar notificación"),
  });
}
