/** TypeScript types for Notification responses. */

export type NotificationChannel = "email" | "sms";
export type NotificationType = "expiry_reminder" | "inactivity_alert" | "custom";
export type NotificationStatus = "sent" | "failed";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  expiry_reminder: "Recordatorio de vencimiento",
  inactivity_alert: "Alerta de inactividad",
  custom: "Mensaje personalizado",
};

export interface NotificationResponse {
  notification_id: string;
  student_id: string | null;
  student_name: string | null;
  notification_type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  subject: string;
  recipient_email: string | null;
  sent_at: string;
  error_message: string | null;
}

export interface BulkNotificationResult {
  sent: number;
  failed: number;
  skipped: number;
  notifications: NotificationResponse[];
}

export interface SendBulkRequest {
  critical_days?: number;
  warning_days?: number;
  inactive_days?: number;
  dry_run?: boolean;
}

export interface SendCustomRequest {
  subject: string;
  message: string;
  channel?: NotificationChannel;
}
