# Deployment Guide — Fitness Room System

> **Production-only** deployment on AWS. No dev/staging environments to minimize costs.

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Account 948999370306                  │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────┐  │
│  │ DynamoDB  │  │ Cognito  │  │  API Gateway v2 + Lambda     │  │
│  │ (single   │  │ User Pool│  │  (FastAPI via Mangum)         │  │
│  │  table)   │  │          │  │  + SES + SNS                 │  │
│  └──────────┘  └──────────┘  └──────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │ S3 + CloudFront      │  │ S3 + CloudFront      │            │
│  │ (Admin Frontend)     │  │ (Student Portal)     │            │
│  └──────────────────────┘  └──────────────────────┘            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ CodePipeline V2                                          │  │
│  │ S3 Source → Manual Approve → CodeBuild (backend + front) │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- AWS CLI configured with profile `salle-cajas`
- Node.js 22+ (for CDK CLI)
- Python 3.12+ (for CDK stacks and backend)

## First-Time Setup

### 1. Bootstrap CDK

```bash
AWS_PROFILE=salle-cajas npx aws-cdk bootstrap aws://948999370306/us-west-2
```

### 2. Deploy all stacks

```bash
cd infrastructure/cdk
AWS_PROFILE=salle-cajas npx aws-cdk deploy --all --require-approval broadening
```

This creates (in order):
1. **DynamoDB table** (`fitness-room-prod`)
2. **Cognito User Pool** (`fitness-room-prod`)
3. **S3 + CloudFront** for admin frontend
4. **S3 + CloudFront** for student portal
5. **Lambda + API Gateway** (backend API)
6. **CodePipeline** (CI/CD)

### 3. Note the outputs

After deploy, CDK prints outputs like:
- `ApiUrl` — your API endpoint
- `UserPoolId` / `UserPoolClientId` — for frontend config
- `CloudFrontUrl` / `PortalCloudFrontUrl` — frontend URLs
- `SourceBucketName` — where to upload releases

### 4. Verify SES sender

Check the inbox of `noreply@fitness-room.mx` and click the SES verification link.

## Release Flow

### Tag a version

```bash
make tag V=1.2.3
```

This:
- Updates the `VERSION` file to `1.2.3`
- Creates a git commit + annotated tag `v1.2.3`

### Deploy to production

```bash
make release
```

This:
1. Packages the repo into a zip via `git archive`
2. Uploads to `s3://fitness-room-pipeline-source-948999370306/fitness-room-source.zip`
3. CodePipeline detects the new S3 object and starts:
   - **Approve** stage — manual approval in AWS Console
   - **Build** stage — parallel CodeBuild projects:
     - **Backend**: CDK deploy (Lambda + layer + infra updates)
     - **Frontend**: npm build → S3 sync → CloudFront invalidation

### Monitor pipeline

```
https://us-west-2.console.aws.amazon.com/codesuite/codepipeline/pipelines/fitness-room-prod/view
```

## Version Management

- `VERSION` file at repo root contains the current version (semver)
- `make tag V=x.y.z` bumps version + creates git tag
- `make version` shows current version
- During build, `VITE_APP_VERSION` is injected into the frontend
- Access in frontend: `import.meta.env.VITE_APP_VERSION`

## Configuration

All config lives in `infrastructure/cdk/cdk.json` context:

| Key | Default | Description |
| --- | ------- | ----------- |
| `domain` | `""` (empty) | Custom domain. Empty = use CloudFront URLs |
| `adminSubdomain` | `app` | Subdomain for admin frontend |
| `portalSubdomain` | `portal` | Subdomain for student portal |
| `apiSubdomain` | `api` | Subdomain for API |
| `senderEmail` | `noreply@fitness-room.mx` | SES sender email |
| `senderName` | `Fitness Room` | SES sender display name |
| `projectName` | `fitness-room` | Project name for tagging |

### Adding a custom domain later

1. Register/transfer domain to Route53 (or create Hosted Zone)
2. Update `cdk.json`: `"domain": "fitnessroom.mx"`
3. Add ACM certificate + Route53 records to hosting stacks
4. Re-deploy: `make release`

## Cost Optimization

- **DynamoDB**: Pay-per-request (no idle cost)
- **Lambda**: Pay-per-invocation (no idle cost)
- **API Gateway v2**: HTTP API (cheaper than REST API)
- **CloudFront**: PRICE_CLASS_100 (cheapest tier)
- **S3**: Standard class, lifecycle rules on pipeline source
- **CodePipeline V2**: Pay per execution (not per month)
- **CodeBuild**: Pay per build minute (SMALL compute)
- **No dev/staging environments** — single prod reduces all costs by ~66%

## CDK Stacks

| Stack | Resources |
| ----- | --------- |
| `FitnessRoomDatabaseStack-prod` | DynamoDB table + 3 GSIs |
| `FitnessRoomAuthStack-prod` | Cognito User Pool + Client + Groups |
| `FitnessRoomApiStack-prod` | Lambda + API Gateway v2 + SES + EventBridge |
| `FitnessRoomHostingStack-prod` | S3 + CloudFront (admin) |
| `FitnessRoomPortalHostingStack-prod` | S3 + CloudFront (portal) |
| `FitnessRoomPipelineStack-prod` | S3 source + CodePipeline + 2 CodeBuild projects |

## AWS Profile

**Always use `salle-cajas`** for all AWS commands:

```bash
export AWS_PROFILE=salle-cajas
```

This is set automatically by `.envrc` (direnv) when you `cd` into the project.
