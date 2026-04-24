# AI Context — Fitness Room System

Quick-start guide for AI assistants working on this codebase.

---

## What This Repo Is

A gym management system for **Fitness Room**, a fitness studio in Mexico. Handles members, memberships, classes, check-ins, and administrative functions.

---

## Apps Included

| App | Path | Purpose | Tech |
|-----|------|---------|------|
| **Admin Frontend** | `/frontend/` | Admin panel for staff | React 19 + TanStack Router + Tailwind 4 |
| **Student Portal** | `/portal/` | Member-facing app (QR, schedule) | React 19 + React Router 7 + Tailwind 3 |
| **Backend API** | `/backend/` | REST API | Python 3.12 + FastAPI + Lambda |
| **Gym Landing** | `/gym-landing/` | Marketing landing page | Next.js 16 |
| **Platform Landing** | `/landing/` | Platform marketing site | Next.js 15 |
| **Infrastructure** | `/infrastructure/` | AWS CDK stacks | CDK v2 Python |

---

## How Apps Connect

```
┌──────────────────┐     ┌──────────────────┐
│  Admin Frontend  │     │  Student Portal  │
│ admin.fitnessroom│     │portal.fitnessroom│
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         │    HTTPS + JWT         │
         └──────────┬─────────────┘
                    │
         ┌──────────▼──────────┐
         │    API Gateway v2   │
         │  api.fitnessroom.mx │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │   Lambda (FastAPI)  │
         └──────────┬──────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼───┐     ┌─────▼─────┐   ┌─────▼─────┐
│DynamoDB│    │  Cognito  │   │    SES    │
└────────┘    └───────────┘   └───────────┘
```

---

## Key Business Entities

| Entity | Description |
|--------|-------------|
| **Student** | Gym member with profile, status (active/inactive/suspended) |
| **Membership** | Time-based or class-pack subscription tied to student |
| **Instructor** | Staff member who teaches classes |
| **Class** | Scheduled session with instructor, capacity, date/time |
| **Reservation** | Student booking for a class |
| **Check-in** | Entry log when student visits the gym |
| **Transaction** | Payment record |
| **Product** | Inventory item (water, supplements, etc.) |

---

## Critical Flows

### Check-in Flow (Most Important)
1. Receptionist searches student by name
2. System validates: student active + membership active
3. Records check-in timestamp
4. Shows green/red access indicator

### Student Registration Flow
1. Admin creates student with basic info
2. Backend auto-creates Cognito user
3. Sends welcome email with temp password
4. Student logs into portal, changes password

### Membership Flow
1. Admin creates membership for student
2. Membership has type, start/end dates, price
3. Status: active → expired → cancelled
4. Can be frozen (paused) if student is suspended

---

## Local Development

### Backend
```bash
cd backend
uv sync
uv run uvicorn src.main:app --reload --port 8000
```

### Admin Frontend
```bash
cd frontend
pnpm install
pnpm dev  # http://localhost:5173
```

### Student Portal
```bash
cd portal
npm install
npm run dev  # http://localhost:5174
```

---

## Common Commands

| Command | Location | Purpose |
|---------|----------|---------|
| `pnpm build` | `/frontend/` | Build admin for prod |
| `npm run build` | `/portal/` | Build portal for prod |
| `pytest` | `/backend/` | Run backend tests |
| `ruff check src/` | `/backend/` | Lint Python code |
| `npm run lint` | `/frontend/` | Lint TypeScript |
| `npm run type-check` | `/portal/` | TypeScript check |

---

## Deployment

### Backend (Lambda)
```bash
cd infrastructure/cdk
AWS_PROFILE=salle-cajas npx aws-cdk deploy FitnessRoomApiStack-prod
```

### Frontend (S3 + CloudFront)
```bash
cd frontend && pnpm build
aws s3 sync dist/ s3://fitness-room-frontend-prod-948999370306 --delete --profile salle-cajas
aws cloudfront create-invalidation --distribution-id E1B51EPZN5PP0I --paths "/*" --profile salle-cajas
```

### Portal (S3 + CloudFront)
```bash
cd portal && npm run build
aws s3 sync dist/ s3://fitness-room-portal-prod-948999370306 --delete --profile salle-cajas
aws cloudfront create-invalidation --distribution-id E1VDFNEUSV0C0D --paths "/*" --profile salle-cajas
```

---

## Coding Rules

### Must Follow
- Use CSS custom properties for colors in frontend (`--gold`, `--bg-surface`)
- Type all functions with explicit return types
- All user-visible strings must be in i18n files (es.json + en.json)
- Never commit `.env` files with real credentials
- Backend layered architecture: router → service → repository

### Never Break
- Check-in flow — this runs many times daily
- Cognito auth integration
- DynamoDB single-table design patterns
- Student/Membership relationship integrity

---

## Known Risks

1. **GSI scans for uniqueness** — Current email/phone uniqueness uses GSI scan with limit. Fine for <500 records.
2. **No staging environment** — Only prod and local exist.
3. **Bundle size** — Frontend is 1.6MB uncompressed. Consider code splitting.
4. **Portal uses Tailwind 3** — Don't mix with frontend's Tailwind 4 components.

---

## Priority Areas

When working on this repo, prioritize:
1. **Data integrity** — Never create orphan records or invalid states
2. **Auth security** — Cognito tokens, permissions checks
3. **Translation coverage** — Both ES and EN must have all keys
4. **Check-in reliability** — Most-used feature by staff

---

## Common Pitfalls

- **Wrong AWS profile** — Always use `--profile salle-cajas`
- **Portal vs Frontend** — They have different routing libraries and Tailwind versions
- **Version bump** — Must update 5 files (VERSION, frontend/package.json, portal/package.json, backend pyproject.toml, backend health.py, frontend changelog.ts)
- **i18n keys** — Adding to one locale without the other causes runtime errors

---

## File Locations

| Need | Location |
|------|----------|
| API routes | `/backend/src/routers/` |
| Business logic | `/backend/src/services/` |
| DynamoDB access | `/backend/src/repositories/` |
| Pydantic models | `/backend/src/models/` |
| Frontend pages | `/frontend/src/routes/` |
| React hooks | `/frontend/src/hooks/` |
| API clients | `/frontend/src/services/` |
| TypeScript types | `/frontend/src/types/` |
| Translations | `/frontend/src/i18n/locales/` |
| Portal pages | `/portal/src/pages/` |
| CDK stacks | `/infrastructure/cdk/stacks/` |

---

*Last updated: 2026-04-24 | v1.5.5*
