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
| **SES** | Transactional emails (membership expiry alerts) |
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
| 3 | WhatsApp Business API, Advanced cash management | Planned |
| 4 | Loyalty rankings, Motivation metrics, Native mobile app | Planned |
