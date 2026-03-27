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
| **S3** | Frontend static asset storage |
| **CloudFront** | CDN for frontend, SSL termination |
| **CloudWatch** | Logs, metrics, alarms |
| **X-Ray** | Distributed tracing (via Lambda Powertools) |
| **Secrets Manager** | Sensitive config storage |

## CDK Stacks

| Stack | Exports |
|---|---|
| `FitnessRoomAuthStack-{env}` | `UserPoolId`, `UserPoolClientId` |
| `FitnessRoomDatabaseStack-{env}` | `TableName`, `TableArn` |
| `FitnessRoomApiStack-{env}` | `ApiUrl`, `LambdaArn` |
| `FitnessRoomHostingStack-{env}` | `CloudFrontUrl`, `BucketName` |

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

```
Routes (TanStack Router file-based)
    └── Page Components
        └── hooks/ (TanStack Query — data fetching + cache)
            └── services/ (Axios API client)
                └── API Gateway
```

### State Management

- **Server state** — TanStack Query v5 (cache, refetch, mutations)
- **Client/UI state** — Zustand v5 (theme, user preferences)
- **Form state** — React Hook Form + Zod validation

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
