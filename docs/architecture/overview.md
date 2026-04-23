# Architecture Overview — Fitness Room System

## High-Level Architecture

```
                        ┌─────────────────────────────────────┐
                        │          CloudFront CDN              │
                        │    (S3 Origin — React SPA)           │
                        └──────────────┬──────────────────────┘
                                       │
                        ┌──────────────▼──────────────────────┐
                        │       API Gateway v2 HTTP API        │
                        │    + Cognito JWT Authorizer           │
                        └──────────────┬──────────────────────┘
                                       │
                        ┌──────────────▼──────────────────────┐
                        │     AWS Lambda (FastAPI + Mangum)    │
                        │     Python 3.12                      │
                        └──────────────┬──────────────────────┘
                                       │
                        ┌──────────────▼──────────────────────┐
                        │       DynamoDB — Single Table        │
                        │       fitness-room-{env}             │
                        └─────────────────────────────────────┘
```

## Request Flow

```
Browser → CloudFront → S3 (HTML/JS/CSS)
Browser → API Gateway → Cognito Authorizer → Lambda → DynamoDB
```

## AWS Services Used

| Service | Purpose |
|---|---|
| **Cognito User Pools** | Authentication & JWT token issuance |
| **API Gateway v2 HTTP** | REST API endpoint with JWT authorization |
| **Lambda** | Serverless compute running FastAPI via Mangum |
| **DynamoDB** | NoSQL single-table storage |
| **S3** | Frontend static asset storage (admin + portal) |
| **CloudFront** | CDN for frontend, SSL termination (2 distributions) |
| **SES** | Transactional emails (membership expiry, portal credentials) |
| **EventBridge** | Scheduled triggers for notification Lambda |
| **CloudWatch** | Logs, metrics, alarms |
| **X-Ray** | Distributed tracing (via Lambda Powertools) |
| **Secrets Manager** | Sensitive config storage |

## CDK Stacks

| Stack | Exports |
|---|---|
| `FitnessRoomDatabaseStack-{env}` | `TableName`, `TableArn` |
| `FitnessRoomAuthStack-{env}` | `UserPoolId`, `UserPoolClientId` |
| `FitnessRoomApiStack-{env}` | `ApiUrl`, `LambdaArn` |
| `FitnessRoomHostingStack-{env}` | `CloudFrontUrl`, `BucketName` (admin frontend) |
| `FitnessRoomPortalHostingStack-{env}` | `PortalCloudFrontUrl`, `PortalBucketName` |

Deploy order: Database → Auth → Api → Hosting → PortalHosting

## Backend Layer Pattern

```
HTTP Request
    └── Router (FastAPI)
        └── Service (Business Logic)
            └── Repository (DynamoDB Access)
                └── DynamoDB
```

### Layers

- **Router** — FastAPI route handlers, input validation via Pydantic, HTTP response mapping
- **Service** — Orchestrates business rules, calls repositories, raises domain exceptions
- **Repository** — Encapsulates all DynamoDB operations, returns typed domain models
- **Models** — Pydantic v2 data models, DynamoDB item converters
- **Utils** — Shared utilities (phone validation, auth helpers, exceptions)

### Key Backend Modules

| Module | Router | Purpose |
|---|---|---|
| Students | `/students` | CRUD, search, photo upload |
| Memberships | `/memberships` | CRUD, freeze/unfreeze, renewal |
| Classes | `/classes` | Schedule, capacity, waitlist |
| Reservations | `/reservations` | Book, cancel, auto-promote from waitlist |
| Instructors | `/instructors` | CRUD + auto Cognito user creation (staff group) |
| Check-in | `/checkin` | Search, register, QR scan |
| Users | `/users` | Admin-only Cognito user management (CRUD, groups, enable/disable) |
| Portal | `/portal` | Student/instructor self-service (profile, membership, schedule) |
| Settings | `/settings` | Gym configuration |
| Dashboard | `/dashboard` | Real-time stats |
| Reports | `/reports` | Excel/PDF export |

## Frontend Architecture

### Admin Panel (`/frontend`)

```
Routes (TanStack Router file-based)
    └── Page Components
        └── hooks/ (TanStack Query — data fetching + cache)
            └── services/ (Axios API client)
                └── API Gateway
```

**State Management:**
- **Server state** — TanStack Query v5 (cache, refetch, mutations)
- **Client/UI state** — Zustand v5 (theme, user preferences)
- **Form state** — React Hook Form + Zod validation

### Portal (`/portal`)

```
Routes (React Router DOM v7)
    └── Page Components
        └── TanStack Query hooks
            └── services/api.ts (Axios)
                └── API Gateway /portal/*
```

The portal is a mobile-first app for students and instructors. It uses separate Cognito app client credentials and calls only the `/api/v1/portal/` prefix.

**Role-based views:**
- **Students** — QR check-in, class enrollment, membership status
- **Staff/Instructors** — Assigned classes, full schedule view (QR hidden)

## Authentication Flow

```
1. User visits app → Amplify redirects to Cognito Hosted UI
2. User logs in → Cognito issues ID token + Access token
3. Token stored in memory by Amplify
4. Every API request → Amplify attaches Bearer token
5. API Gateway validates token against Cognito JWKS
6. Lambda receives decoded token claims
```

## Environments

| Env | Purpose |
|---|---|
| `local` | Developer laptop — LocalStack or mock |
| `dev` | Shared development environment on AWS |
| `staging` | Pre-production validation |
| `prod` | Production |

## Implemented Phases

| Phase | Modules | Status |
|---|---|---|
| 1 | Students, Memberships, Classes, Reservations, Instructors, Check-in, Dashboard | Done |
| 2 | Email notifications (SES), Reports, Cash register, Inventory | Done |
| 2.5 | QR Check-in, Membership freeze, PDF/Excel export, Student portal | Done |
| 2.7 | International phone validation, structured address, user management, portal role-based views, configurable specialties | Done |
| 3 | WhatsApp Business API, Advanced cash management | Planned |
| 4 | Loyalty rankings, Motivation metrics, Native mobile app | Planned |

## International Phone & Address Support

- **Phone**: E.164 format with country selector (MX, US, CO, AR, ES, CL, PE, BR, EC, GT)
- **Backend**: `src/utils/phone.py` — `validate_phone_required()`, `validate_phone_optional()`, `normalize_phone()`
- **Frontend**: `PhoneInput` component with country dropdown, auto-formatting, validation
- **Address**: Structured fields (street, ext#, int#, colonia, city, state, ZIP) with 32 MX states dictionary
- **Frontend**: `AddressInput` component with state dropdown

## Cognito User Management

| Group | Access | Created by |
|---|---|---|
| `admin` | Full admin panel access | Admin via Users page |
| `staff` | Limited admin panel (receptionist) | Admin via Users page or auto on instructor creation |
| `student` | Portal only | Auto on student creation |

**Admin endpoints** (`/api/v1/users/`, admin-only):
- List all Cognito users with groups
- Create user with group assignment + auto email credentials
- Enable/disable/delete users
- Update group memberships
