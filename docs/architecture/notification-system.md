# Notification System — Architecture & Events

> **Phase 2 Feature** — Comprehensive email + SMS notifications for all business events.

## Overview

The notification system sends **email** (AWS SES) and **SMS** (AWS SNS) notifications to **students**, **instructors**, and **admins** when relevant business events occur.

All notification delivery is **fire-and-forget** — failures never break the main business flow. Every attempt (success or failure) is logged to DynamoDB for audit.

## Architecture

```
┌──────────────────────┐
│   Router / Endpoint   │
└───────┬──────────────┘
        │ calls
        ▼
┌──────────────────────┐
│    EventNotifier     │  ← New dispatcher for all event-driven notifications
│  (event_notifier.py) │
└───┬──────────┬───────┘
    │          │
    ▼          ▼
┌────────┐ ┌────────┐
│  SES   │ │  SNS   │  ← AWS services (email / SMS)
│ Email  │ │  SMS   │
└────────┘ └────────┘
    │          │
    ▼          ▼
┌──────────────────────┐
│ NotificationRepository│  ← Logs every send to DynamoDB
│  (DynamoDB)           │
└──────────────────────┘
```

### Components

| File | Purpose |
|------|---------|
| `services/event_notifier.py` | Central dispatcher — one method per event, sends email + SMS, logs to DB |
| `services/notification_service.py` | Bulk/scheduled notifications (expiry reminders, inactivity alerts) |
| `services/email_templates.py` | HTML email templates for all event types |
| `services/carta_responsiva.py` | PDF generator for the liability waiver (carta responsiva) using ReportLab |
| `models/notification.py` | Pydantic models, NotificationType enum, DynamoDB item |
| `repositories/notification_repository.py` | DynamoDB CRUD for notification logs |
| `config.py` | SES/SNS configuration (sender email, SMS sender ID, etc.) |

## Notification Events Matrix

### Student Notifications (→ Student)

| Event | Trigger | Email | SMS | Template |
|-------|---------|:-----:|:---:|----------|
| **Reservation Confirmed** | Student enrolls in a class with available spots | ✅ | ✅ | `reservation_confirmed_html` |
| **Reservation Cancelled** | Student (or admin) cancels a reservation | ✅ | ✅ | `reservation_cancelled_html` |
| **Waitlist Joined** | Student enrolls in a full class | ✅ | ✅ | `waitlist_joined_html` |
| **Waitlist Promoted** | A spot opens and student is auto-promoted to confirmed | ✅ | ✅ | `waitlist_promoted_html` |
| **Class Cancelled** | Admin cancels a class → all enrolled students notified | ✅ | ✅ | `class_cancelled_html` |
| **Class Reminder** | Scheduled: 1 hour before class start | ✅ | ✅ | `class_reminder_html` |
| **Membership Created** | Admin assigns a new membership to student | ✅ | ✅ | `membership_created_html` |
| **Membership Frozen** | Admin freezes a student's membership | ✅ | ✅ | `membership_frozen_html` |
| **Membership Unfrozen** | Admin unfreezes a student's membership | ✅ | ✅ | `membership_unfrozen_html` |
| **Expiry Reminder** | Scheduled: membership expiring within N days | ✅ | ❌ | `expiry_reminder_html` |
| **Inactivity Alert** | Scheduled: student hasn't checked in for N days | ✅ | ❌ | `inactivity_alert_html` |
| **Custom Notification** | Admin sends a one-off message to a student | ✅ | ❌ | `custom_notification_html` |

### Instructor Notifications (→ Instructor)

| Event | Trigger | Email | SMS | Template |
|-------|---------|:-----:|:---:|----------|
| **Student Enrolled** | A student confirms enrollment in instructor's class | ✅ | ✅ | `instructor_student_enrolled_html` |
| **Student Cancelled** | A student cancels from instructor's class | ✅ | ✅ | `instructor_student_cancelled_html` |
| **Class Full** | Instructor's class reaches max capacity | ✅ | ✅ | `instructor_class_full_html` |
| **Class Assigned** | Admin creates a new class and assigns this instructor | ✅ | ✅ | `instructor_class_assigned_html` |
| **Class Cancelled** | Admin cancels a class this instructor was teaching | ✅ | ✅ | `instructor_class_cancelled_html` |

### Admin Notifications (→ All Admins)

| Event | Trigger | Email | SMS | Template |
|-------|---------|:-----:|:---:|----------|
| **New Student** | A new student is registered in the system | ✅ | ✅ | `admin_new_student_html` |
| **Membership Expired** | A student's membership has expired (scheduled) | ✅ | ❌ | `admin_membership_expired_html` |
| **Low Stock** | Product stock drops below threshold | ✅ | ❌ | `low_stock_alert_html` |

## Integration Points

### Routers with Notifications

| Router | Endpoint | Events Fired |
|--------|----------|-------------|
| `portal.py` | `POST /portal/reservations` | `RESERVATION_CONFIRMED` / `WAITLIST_JOINED` → student, `INSTRUCTOR_STUDENT_ENROLLED` / `INSTRUCTOR_CLASS_FULL` → instructor |
| `portal.py` | `DELETE /portal/reservations/{class_id}` | `RESERVATION_CANCELLED` → student, `INSTRUCTOR_STUDENT_CANCELLED` → instructor, `WAITLIST_PROMOTED` → promoted student |
| `reservations.py` | `POST /reservations` | `RESERVATION_CONFIRMED` / `WAITLIST_JOINED` → student, `INSTRUCTOR_STUDENT_ENROLLED` → instructor |
| `reservations.py` | `DELETE /reservations/class/{id}/student/{id}` | `RESERVATION_CANCELLED` → student, `INSTRUCTOR_STUDENT_CANCELLED` → instructor |
| `classes.py` | `POST /classes` | `INSTRUCTOR_CLASS_ASSIGNED` → instructor |
| `classes.py` | `POST /classes/{id}/cancel` | `INSTRUCTOR_CLASS_CANCELLED` → instructor, `CLASS_CANCELLED` → all enrolled students |
| `memberships.py` | `POST /memberships` | `MEMBERSHIP_CREATED` → student |
| `memberships.py` | `POST /memberships/.../freeze` | `MEMBERSHIP_FROZEN` → student |
| `memberships.py` | `POST /memberships/.../unfreeze` | `MEMBERSHIP_UNFROZEN` → student |
| `students.py` | `POST /students` | `ADMIN_NEW_STUDENT` → all admins |
| `notifications.py` | `POST /notifications/send-expiry-reminders` | `EXPIRY_REMINDER` → students (bulk) |
| `notifications.py` | `POST /notifications/send-inactivity-alerts` | `INACTIVITY_ALERT` → students (bulk) |
| `notifications.py` | `POST /notifications/student/{id}` | `CUSTOM` → specific student |
| *Inventory service* | `sell_product()` internal | `LOW_STOCK` → all admins |

## SMS Configuration

SMS delivery is powered by **AWS SNS** in `Transactional` mode.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SMS_ENABLED` | `false` | Master switch for SMS delivery |
| `SMS_SENDER_ID` | `FitnessRoom` | Alphanumeric sender ID (max 11 chars) |

### SMS Text Templates

All SMS messages follow the format: `{GymName}: {message}` and are capped at ~160 characters. Templates are defined in `event_notifier.py::_SMS` dict.

### Enabling SMS in Production

1. Set `SMS_ENABLED=true` in Lambda environment variables
2. Request SNS SMS sandbox exit in AWS Console → SNS → Text messaging
3. Ensure students and instructors have valid phone numbers in `+52XXXXXXXXXX` format

## Email Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SES_SENDER_EMAIL` | `noreply@fitness-room.mx` | Verified SES sender address |
| `SES_SENDER_NAME` | `Fitness Room` | Display name in From field |
| `GYM_PHONE` | *(empty)* | Phone number shown in email footers |

### Email Design

All templates use the shared `_base_layout()` wrapper:

- **Brand colors**: Black (#0a0a0a) + Gold (#d4af37)
- **Inline CSS** for maximum email client compatibility
- **Responsive** 600px max-width
- **Spanish** language

## DynamoDB Access Patterns

Notification logs use the single-table design:

| Key | Pattern | Example |
|-----|---------|---------|
| PK | `NOTIFICATION#{id}` | `NOTIFICATION#abc-123` |
| SK | `METADATA` | `METADATA` |
| GSI1PK | `NOTIFICATIONS` | `NOTIFICATIONS` |
| GSI1SK | `DATE#{date}T{time}#{id}` | `DATE#2026-04-20T11:30:00#abc-123` |

### Stored Fields

```
notification_id, student_id, student_name, notification_type, channel,
status, subject, recipient_email, recipient_phone, recipient_role,
sent_at, error_message
```

## Local Development

In local mode (`ENVIRONMENT=local`):

- **Emails are NOT sent** — they are logged at `INFO` level
- **SMS are NOT sent** — they are logged at `INFO` level
- Notification items **ARE** written to DynamoDB Local for testing
- You can verify notifications via `GET /notifications` or by checking the backend console output

## Flow Examples

### Student cancels → instructor gets notified

```
1. Student calls DELETE /portal/reservations/{class_id}
2. Reservation is cancelled in DynamoDB
3. EventNotifier.notify_reservation_cancelled() → sends email + SMS to student
4. EventNotifier.notify_instructor_student_cancelled() → sends email + SMS to instructor
5. Waitlist promotion check runs
6. If someone promoted: EventNotifier.notify_waitlist_promoted() → email + SMS to promoted student
7. All notification attempts logged to DynamoDB
```

### Admin creates class → instructor notified

```
1. Admin calls POST /classes with instructor_name
2. Class created in DynamoDB
3. EventNotifier resolves instructor by name → finds email/phone
4. EventNotifier.notify_instructor_class_assigned() → email + SMS
5. Logged to DynamoDB
```

### Admin cancels class → everyone notified

```text
1. Admin calls POST /classes/{id}/cancel
2. Class marked as cancelled in DynamoDB
3. EventNotifier.notify_instructor_class_cancelled() → email + SMS to instructor
4. All enrolled students fetched from reservations
5. EventNotifier.notify_class_cancelled_to_students() → email + SMS to each student
6. All notifications logged to DynamoDB
```

### Admin creates student → welcome + carta responsiva

```text
1. Admin calls POST /students with student data
2. Student created in DynamoDB + Cognito
3. EventNotifier.notify_welcome_carta_responsiva():
   a. Generates PDF carta responsiva with student name, email, date (ReportLab)
   b. Builds MIME multipart email with HTML body + PDF attachment
   c. Sends via SES send_raw_email
4. EventNotifier.notify_admin_new_student() → email + SMS to all admins
5. All notifications logged to DynamoDB
```

## Carta Responsiva (Liability Waiver)

When a new student is registered (`POST /students`), the system automatically:

1. **Generates a personalized PDF** using ReportLab with:
   - Student full name
   - Student email (as digital identifier)
   - Current date in Spanish (e.g., "20 de abril de 2026")
   - 6 legal sections: Health, Risks, Liability, Rules, Personal Belongings, Data Privacy
   - Signature block for student and gym representative
   - Digital signature note with email and date

2. **Sends a welcome email** with the PDF attached via SES `send_raw_email` (MIME multipart)

3. **Logs the notification** to DynamoDB

### PDF Template

The carta responsiva PDF is generated in `services/carta_responsiva.py` and contains:

- **Section 1** — Estado de Salud (health declaration)
- **Section 2** — Conocimiento de Riesgos (risk acknowledgment)
- **Section 3** — Responsabilidad y Deslinde (liability waiver)
- **Section 4** — Reglamento Interno (internal rules)
- **Section 5** — Objetos Personales (personal belongings)
- **Section 6** — Datos Personales (data privacy / LFPDPPP compliance)

### Dependencies

- `reportlab>=4.2.0` — PDF generation library (added to `pyproject.toml`)

## Phone & Email Validation

### Backend Validation (Pydantic)

All phone numbers are validated and normalized to the Mexican format `+52XXXXXXXXXX`:

- **Input formats accepted**: `5512345678`, `525512345678`, `+525512345678`, `55 1234 5678`
- **Output format**: always `+52XXXXXXXXXX` (E.164)
- **Rejection**: any phone that doesn't resolve to exactly `+52` + 10 digits
- **Applied to**: `StudentCreate`, `StudentUpdate`, `InstructorCreate`, `InstructorUpdate`

Email validation uses Pydantic's `EmailStr` which validates RFC 5322 format.

### Frontend Validation (React)

All 4 modal forms (CreateStudent, EditStudent, CreateInstructor, EditInstructor) include:

- **Phone**: input mask (`inputMode="tel"`, `maxLength=18`), real-time normalization preview (green text showing `+52 XX XXXX XXXX`), red error state on invalid format
- **Email**: regex pattern validation, red border + error text on invalid format
- **Both**: form submission is **blocked** if validation fails (button stays enabled but `handleSubmit` returns early)
