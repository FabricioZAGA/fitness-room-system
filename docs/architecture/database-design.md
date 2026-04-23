# DynamoDB Database Design — Fitness Room System

## Table: `fitness-room-{env}`

Single-table design. All entities share one table with composite keys.

### Key Schema

| Attribute | Type | Description |
|---|---|---|
| `PK` | String | Partition key — entity identifier |
| `SK` | String | Sort key — entity type or sub-item |
| `GSI1PK` | String | GSI 1 partition key |
| `GSI1SK` | String | GSI 1 sort key |
| `GSI2PK` | String | GSI 2 partition key |
| `GSI2SK` | String | GSI 2 sort key |

### Indexes

| Index | PK | SK | Use Case |
|---|---|---|---|
| Table | `PK` | `SK` | Direct entity lookup |
| `GSI1` | `GSI1PK` | `GSI1SK` | Query by email, by student_id |
| `GSI2` | `GSI2PK` | `GSI2SK` | Query by date, by status |

---

## Access Patterns

### Students

| Pattern | Key | Index |
|---|---|---|
| Get student by ID | `PK=STUDENT#{id}`, `SK=PROFILE` | Table |
| List all students | `GSI1PK=STUDENTS`, `GSI1SK=begins_with(STATUS#{status})` | GSI1 |
| Get student by email | `GSI2PK=EMAIL#{email}` | GSI2 |

**Item shape:**
```
PK:     STUDENT#{student_id}
SK:     PROFILE
GSI1PK: STUDENTS
GSI1SK: STATUS#{status}#STUDENT#{student_id}
GSI2PK: EMAIL#{email}
GSI2SK: STUDENT#{student_id}
```

**Student attributes (v1.1.0):**
| Attribute | Type | Description |
|---|---|---|
| `first_name` | String | Required |
| `last_name` | String | Required |
| `email` | String | Required, unique |
| `phone` | String | Optional, E.164 international format (e.g. +525512345678, +14155551234) |
| `birth_date` | String (ISO) | Optional |
| `address` | String | Optional, formatted from structured address (street, colonia, city, state, ZIP) |
| `city` | String | Optional (legacy; now part of structured address) |
| `emergency_contact` | Map | Optional — `{name, relationship, phone}` |
| `photo_url` | String | Optional, S3 URL for profile photo |
| `status` | String | active, inactive, new, founder |
| `notes` | String | Optional, internal notes |

---

### Memberships

| Pattern | Key | Index |
|---|---|---|
| Get membership by ID | `PK=STUDENT#{id}`, `SK=MEMBERSHIP#{id}` | Table |
| List memberships for student | `PK=STUDENT#{id}`, `SK=begins_with(MEMBERSHIP#)` | Table |
| Get active membership | `GSI1PK=STUDENT#{id}`, `GSI1SK=ACTIVE_MEMBERSHIP` | GSI1 |
| List memberships expiring soon | `GSI2PK=MEMBERSHIPS`, `GSI2SK=between(EXPIRY#date1, EXPIRY#date2)` | GSI2 |

**Item shape:**
```
PK:     STUDENT#{student_id}
SK:     MEMBERSHIP#{membership_id}
GSI1PK: STUDENT#{student_id}
GSI1SK: ACTIVE_MEMBERSHIP  (only when status=active)
GSI2PK: MEMBERSHIPS
GSI2SK: EXPIRY#{end_date}#STUDENT#{student_id}
```

---

### Classes

| Pattern | Key | Index |
|---|---|---|
| Get class by ID | `PK=CLASS#{id}`, `SK=DETAIL` | Table |
| List classes by date | `GSI1PK=CLASSES`, `GSI1SK=begins_with(DATE#{date})` | GSI1 |
| List classes in date range | `GSI1PK=CLASSES`, `GSI1SK=between(DATE#{start}, DATE#{end})` | GSI1 |

**Item shape:**
```
PK:     CLASS#{class_id}
SK:     DETAIL
GSI1PK: CLASSES
GSI1SK: DATE#{class_date}#TIME#{start_time}#CLASS#{class_id}
```

---

### Reservations

| Pattern | Key | Index |
|---|---|---|
| Get reservation | `PK=CLASS#{id}`, `SK=RESERVATION#{student_id}` | Table |
| List reservations for class | `PK=CLASS#{id}`, `SK=begins_with(RESERVATION#)` | Table |
| List reservations for student | `GSI1PK=STUDENT#{id}`, `GSI1SK=begins_with(RESERVATION#)` | GSI1 |

**Item shape:**
```
PK:     CLASS#{class_id}
SK:     RESERVATION#{student_id}
GSI1PK: STUDENT#{student_id}
GSI1SK: RESERVATION#{class_date}#CLASS#{class_id}
```

---

### Waitlist

| Pattern | Key | Index |
|---|---|---|
| Get waitlist entry | `PK=CLASS#{id}`, `SK=WAITLIST#{position}#{student_id}` | Table |
| List waitlist for class | `PK=CLASS#{id}`, `SK=begins_with(WAITLIST#)` | Table |
| Get student waitlist position | `GSI1PK=STUDENT#{id}`, `GSI1SK=begins_with(WAITLIST#)` | GSI1 |

**Item shape:**
```
PK:     CLASS#{class_id}
SK:     WAITLIST#{position:04d}#{student_id}
GSI1PK: STUDENT#{student_id}
GSI1SK: WAITLIST#{class_id}
```

---

### Instructors

| Pattern | Key | Index |
|---|---|---|
| Get instructor by ID | `PK=INSTRUCTOR#{id}`, `SK=PROFILE` | Table |
| List all instructors | `GSI1PK=INSTRUCTORS`, `GSI1SK=begins_with(STATUS#)` | GSI1 |

**Item shape:**
```
PK:     INSTRUCTOR#{instructor_id}
SK:     PROFILE
GSI1PK: INSTRUCTORS
GSI1SK: STATUS#{status}#INSTRUCTOR#{instructor_id}
GSI2PK: STATUS#{status}
GSI2SK: INSTRUCTOR#{instructor_id}
```

**Instructor attributes:**
| Attribute | Type | Description |
|---|---|---|
| `first_name` | String | Required |
| `last_name` | String | Required |
| `email` | String | Required |
| `phone` | String | Optional, E.164 format |
| `specialties` | List[String] | Configurable tags (e.g. Zumba, Yoga, CrossFit) |
| `bio` | String | Optional |
| `photo_url` | String | Optional, S3 URL |
| `hourly_rate` | Number | Optional |
| `status` | String | active, inactive |

---

### Cognito User Management (not in DynamoDB)

Users are managed in AWS Cognito, not DynamoDB. The `/users` admin endpoints interact directly with Cognito APIs.

| Operation | Cognito API |
|---|---|
| List users | `ListUsers` |
| Create user | `AdminCreateUser` + `AdminAddUserToGroup` |
| Get user | `AdminGetUser` + `AdminListGroupsForUser` |
| Disable/Enable | `AdminDisableUser` / `AdminEnableUser` |
| Delete | Remove from groups + `AdminDeleteUser` |
| Update groups | `AdminRemoveUserFromGroup` + `AdminAddUserToGroup` |

---

## Naming Conventions

- Keys follow `ENTITY_TYPE#id` pattern (`SCREAMING_SNAKE_CASE`)
- Date components use ISO 8601 (`YYYY-MM-DD`) for lexicographic sort
- Time components use `HH:MM:SS` for lexicographic sort
- Numeric positions are zero-padded to 4 digits for correct ordering

## Capacity & Billing

- **Billing mode**: `PAY_PER_REQUEST` (On-Demand) for all environments
- **Point-in-time recovery**: Enabled in `prod`, optional in `dev`
- **Removal policy**: `RETAIN` in `prod`, `DESTROY` in `dev`
