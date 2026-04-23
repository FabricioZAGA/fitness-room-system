# Getting Started — Fitness Room System

## Prerequisites

| Tool        | Version | Install                                                                                              |
| ----------- | ------- | ---------------------------------------------------------------------------------------------------- |
| Python      | 3.12+   | `brew install python@3.12`                                                                           |
| uv          | latest  | `curl -LsSf https://astral.sh/uv/install.sh \| sh`                                                   |
| Node.js     | 22+     | `brew install node`                                                                                  |
| pnpm        | 9+      | `npm install -g pnpm`                                                                                |
| AWS CLI     | v2      | [docs.aws.amazon.com](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| AWS CDK CLI | v2      | `npm install -g aws-cdk`                                                                             |

## AWS Profile Setup

All commands require the `salle-cajas` AWS profile. Configure it once:

```bash
aws configure --profile salle-cajas
# AWS Access Key ID: <your key>
# AWS Secret Access Key: <your secret>
# Default region name: us-east-1
# Default output format: json
```

Verify access:

```bash
aws sts get-caller-identity --profile salle-cajas
# Expected: { "Account": "948999370306", ... }
```

## First-Time Setup

### 1. Clone & Bootstrap

```bash
git clone git@github.com:FabricioZAGA/fitness-room-system.git
cd fitness-room-system

# Bootstrap CDK in your AWS account (only needed once per account/region)
bash infrastructure/scripts/bootstrap.sh
```

### 2. Backend

```bash
cd backend

# Install dependencies with uv
uv sync --all-extras

# Copy environment template
cp .env.example .env
# Edit .env and fill in your Cognito and DynamoDB values
```

### 3. Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
# Edit .env with your Cognito and API values
```

## Local Development

### Start backend (uvicorn)

```bash
cd backend
uv run uvicorn src.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### Start frontend (Vite)

```bash
cd frontend
pnpm dev
```

App available at: http://localhost:5173

### Run all tests

```bash
# Backend
cd backend && uv run pytest tests/ -v

# Frontend
cd frontend && pnpm test
```

### Run linters

```bash
# Backend
cd backend
uv run ruff check src/ tests/
uv run mypy src/

# Frontend
cd frontend
pnpm lint
pnpm type-check
```

Or use the root Makefile:

```bash
make lint          # lint both backend and frontend
make test          # test both
make dev-backend   # start backend only
make dev-frontend  # start frontend only
```

## Deploy to AWS

### Deploy all (first time)

```bash
make deploy-dev      # deploys: Database → Auth → API → Hosting
```

### Deploy individual stacks

```bash
cd infrastructure/cdk
AWS_PROFILE=salle-cajas cdk deploy FitnessRoomDatabaseStack-dev
AWS_PROFILE=salle-cajas cdk deploy FitnessRoomAuthStack-dev
AWS_PROFILE=salle-cajas cdk deploy FitnessRoomApiStack-dev
AWS_PROFILE=salle-cajas cdk deploy FitnessRoomHostingStack-dev
```

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable               | Description        | Example            |
| ---------------------- | ------------------ | ------------------ |
| `ENVIRONMENT`          | App environment    | `local`            |
| `DYNAMODB_TABLE_NAME`  | DynamoDB table     | `fitness-room-dev` |
| `AWS_REGION`           | AWS region         | `us-east-1`        |
| `COGNITO_USER_POOL_ID` | Cognito pool ID    | `us-east-1_XXXX`   |
| `COGNITO_CLIENT_ID`    | Cognito app client | `abcdef123456`     |

### Frontend (`frontend/.env`)

| Variable                    | Description                  | Example                 |
| --------------------------- | ---------------------------- | ----------------------- |
| `VITE_API_BASE_URL`         | Backend API URL              | `http://localhost:8000` |
| `VITE_AWS_REGION`           | AWS region                   | `us-east-1`             |
| `VITE_COGNITO_USER_POOL_ID` | Cognito pool ID              | `us-east-1_XXXX`        |
| `VITE_COGNITO_CLIENT_ID`    | Cognito client ID            | `abcdef123456`          |
| `VITE_APP_NAME`             | Studio name shown in sidebar | `Fitness Room`          |

## Portal Setup

The portal is the mobile-first app for students and instructors. It lives in `/portal/` as a separate React project.

```bash
cd portal
npm install
cp .env.example .env
# Fill in same Cognito values as frontend but with portal-specific client ID
npm run dev
# Portal: http://localhost:5174
```

## Project Structure

```
fitness-room-system/
├── backend/                   # FastAPI Python backend
│   ├── src/
│   │   ├── config.py
│   │   ├── main.py            # Lambda + FastAPI entry point
│   │   ├── models/            # Pydantic v2 domain models
│   │   ├── repositories/      # DynamoDB access layer
│   │   ├── routers/           # FastAPI route handlers (13 modules incl. users)
│   │   ├── services/          # Business logic + cognito_service
│   │   └── utils/             # Auth, exceptions, phone validation
│   └── tests/
├── frontend/                  # React 19 TypeScript SPA — Admin panel
│   └── src/
│       ├── components/        # UI + shared components
│       ├── config/            # Theme configuration
│       ├── hooks/             # TanStack Query hooks (students, instructors, users)
│       ├── lib/               # Utilities, Amplify config, phone, address, specialties
│       ├── routes/            # TanStack Router pages (16 routes incl. /users)
│       ├── services/          # API client + services (student, instructor, user)
│       ├── store/             # Zustand stores
│       └── types/             # TypeScript type definitions
├── portal/                    # React 19 TypeScript SPA — Student/Instructor app
│   └── src/
│       ├── pages/             # Dashboard, Profile, QR, Schedule, Login
│       ├── components/        # BottomNav (role-aware), Card, Button, etc.
│       ├── contexts/          # AuthContext (Amplify)
│       ├── hooks/             # useRole (staff/student detection)
│       └── services/          # api.ts (portal endpoints)
├── infrastructure/
│   └── cdk/                   # AWS CDK v2 stacks
│       └── stacks/
│           ├── auth_stack.py
│           ├── api_stack.py
│           ├── database_stack.py
│           ├── hosting_stack.py
│           └── portal_hosting_stack.py
├── docs/
│   ├── architecture/
│   │   ├── overview.md
│   │   └── database-design.md
│   ├── flows/
│   │   └── gym-operations.md
│   └── getting-started.md     # This file
└── .github/
    └── workflows/             # CI/CD pipelines
```
