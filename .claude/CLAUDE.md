# CLAUDE.md — Fitness Room System (AI Configuration)

> **This file is the single source of truth for ANY AI assistant (Claude Code, Windsurf, Cursor, Copilot, etc.) working on this repo.**
> Read it completely before making any changes. It overrides any conflicting assumptions.
>
> **Current version:** 1.8.5 — Production live since 2026-05-01.

---

## 1. Project Identity

| Key | Value |
|-----|-------|
| **Project** | Fitness Room Management System |
| **Owner** | FabricioZAGA (personal — NEVER touch Realtor/work repos) |
| **AWS Account** | `948999370306` |
| **AWS Profile** | `salle-cajas` — ALWAYS use for ALL AWS/CDK commands |
| **AWS Region** | `us-west-2` (Lambda, DynamoDB, Cognito, SES) / `us-east-1` (CloudFront certs) |
| **Domain** | `fitnessroom.mx` |

### Live URLs

| Service | URL | Infra |
|---------|-----|-------|
| Admin panel | `https://admin.fitnessroom.mx` | CloudFront `E1B51EPZN5PP0I` → S3 `fitness-room-frontend-prod-948999370306` |
| Student portal | `https://portal.fitnessroom.mx` | CloudFront `E1VDFNEUSV0C0D` → S3 `fitness-room-portal-prod-948999370306` |
| API | `https://api.fitnessroom.mx` | API Gateway `8tj1qj884c` → Lambda `fitness-room-api-prod` |
| Gym landing | `https://fitnessroom.mx` | CloudFront `E2L8U17T5LQ01C` → S3 `fitness-room-gym-landing-948999370306` |
| Platform landing | `https://platform.fitnessroom.mx` | CloudFront `E3KGSIELJ3FZ31` → S3 `fitness-room-landing-prod-948999370306` |

---

## 2. Versioning — CRITICAL

**There are 5 places that MUST be updated in sync when bumping the version:**

| # | File | Field | Example |
|---|------|-------|---------|
| 1 | `VERSION` (root) | Plain text | `1.8.5` |
| 2 | `frontend/package.json` | `"version"` | `"1.8.5"` |
| 3 | `frontend/src/lib/changelog.ts` | `APP_VERSION` | `"1.8.5"` |
| 4 | `frontend/src/lib/changelog.ts` | New entry at TOP of `changelog[]` | `{ version: "1.8.5", ... }` |
| 5 | `backend/src/routers/health.py` | `version=` in HealthResponse | `"1.8.5"` |
| 6 | `CHANGELOG.md` (root) | New `## [x.y.z]` section at TOP | Keep a Changelog format |

Run `./scripts/check-version.sh` to verify all 5 sites are in sync. `./scripts/bump-version.sh X.Y.Z` updates them in one shot.

### Version bump rules
- **Patch** (`x.y.Z`): bug fixes, UI tweaks, translation updates
- **Minor** (`x.Y.0`): new features, new modules, new API endpoints
- **Major** (`X.0.0`): breaking changes (never done so far)

### Changelog entry format (changelog.ts)
```typescript
{
  version: "1.8.5",
  date: "2026-05-19",           // YYYY-MM-DD
  title: "Título corto en español",
  items: [
    { icon: "🐛", text: "Descripción del cambio en español" },
  ],
}
```

### CHANGELOG.md format
```markdown
## [1.8.5] — 2026-05-19

### Added
- Feature descriptions

### Fixed
- Bug fix descriptions

### Changed
- Change descriptions

### Removed
- What was deleted
```

---

## 3. Deployment — Step by Step

### 3a. Backend (Lambda via CDK)
```bash
# From infrastructure/cdk/
AWS_PROFILE=salle-cajas npx aws-cdk deploy FitnessRoomApiStack-prod --require-approval never
```

### 3b. Frontend Admin (S3 + CloudFront)
```bash
# Build
cd frontend && npm run build

# Upload to S3
aws s3 sync dist/ s3://fitness-room-frontend-prod-948999370306 --delete --profile salle-cajas

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E1B51EPZN5PP0I --paths "/*" --profile salle-cajas
```

### 3c. Student Portal (S3 + CloudFront)
```bash
cd portal && npm run build
aws s3 sync dist/ s3://fitness-room-portal-prod-948999370306 --delete --profile salle-cajas
aws cloudfront create-invalidation --distribution-id E1VDFNEUSV0C0D --paths "/*" --profile salle-cajas
```

### 3d. Verify deployment
```bash
curl -s https://api.fitnessroom.mx/health | python3 -m json.tool
# Expected: { "status": "ok", "version": "X.Y.Z", "environment": "prod" }
```

### Deploy order
1. CDK backend first (Lambda code update)
2. Frontend build + S3 sync + CloudFront invalidation
3. Portal build + S3 sync + CloudFront invalidation (only if portal changed)
4. Verify API health

---

## 4. Git Conventions

### Branch naming
```
fzacarias/fire-XXXX/short-description
```

### Commit style — Conventional Commits
```
feat: add cross-entity uniqueness validation
fix: correct CORS origin for admin subdomain
docs: update CLAUDE.md with deployment instructions
chore: bump version to 1.5.2
refactor: extract UniquenessService from StudentService
test: add unit tests for membership freeze logic
```

### Rules
- **NEVER push without personal review** — `git push` requires explicit user approval
- Group related changes into logical commits (not one giant commit)
- Version bump commits: `chore: bump version to X.Y.Z`
- Feature commits should describe WHAT changed, not HOW

---

## 5. Architecture

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend (admin) | React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + TanStack Router + TanStack Query |
| Frontend (portal) | React 19 + TypeScript + Vite 6 + Tailwind CSS 3 + React Router DOM 7 |
| Backend | Python 3.12 + FastAPI + Mangum + AWS Lambda Powertools |
| Database | DynamoDB single-table design |
| Auth | AWS Cognito (JWT) |
| Infra | AWS CDK v2 (Python) |
| Email | AWS SES (us-west-2) |
| Hosting | S3 + CloudFront |

### Backend layered pattern (MANDATORY)
```
routers/   → HTTP validation, auth, delegates to service
services/  → Business logic ONLY, calls repository
repositories/ → DynamoDB access ONLY, extends DynamoRepository
models/    → Pydantic v2 schemas (Create, Update, Response, DynamoItem)
```

**NEVER** call boto3/DynamoDB directly from services or routers.

### Frontend pattern (MANDATORY)
```
routes/        → Pages (file-based routing via TanStack Router)
components/
  layout/      → Sidebar, AppLayout
  shared/      → Reusable: modals, badges, dialogs
  ui/          → shadcn/ui primitives
hooks/         → TanStack Query hooks (useStudents, useClasses, etc.)
services/      → Axios API calls (studentService, classService, etc.)
types/         → TypeScript interfaces mirroring backend models
i18n/locales/  → es.json + en.json (BOTH must have identical keys)
store/         → Zustand stores (theme, gym info)
lib/           → Utilities (cn, formatDate, apiError, changelog)
```

### DynamoDB single-table design

| Entity | PK | SK | GSI1PK | GSI1SK |
|--------|----|----|--------|--------|
| Student | `STUDENT#{id}` | `PROFILE` | `STUDENTS` | `{full_name}` |
| Membership | `STUDENT#{id}` | `MEMBERSHIP#{id}` | `MEMBERSHIPS` | `{type}` |
| Class | `CLASS#{id}` | `METADATA` | `CLASSES` | `{date}` |
| Instructor | `INSTRUCTOR#{id}` | `PROFILE` | `INSTRUCTOR` | `{full_name}` |
| Reservation | `CLASS#{id}` | `RESERVATION#{student_id}` | - | - |
| Checkin | `STUDENT#{id}` | `CHECKIN#{datetime}` | - | - |
| Transaction | `TRANSACTION#{id}` | `METADATA` | `TRANSACTIONS` | `{date}` |
| Product | `PRODUCT#{id}` | `METADATA` | `PRODUCTS` | `{name}` |
| Sale | `SALE#{id}` | `METADATA` | `SALES` | `{date}` |

### CDK Stacks (deploy order)
1. `FitnessRoomDatabaseStack-prod` — DynamoDB + S3 buckets
2. `FitnessRoomAuthStack-prod` — Cognito User Pool
3. `FitnessRoomApiStack-prod` — Lambda + API Gateway + EventBridge
4. `FitnessRoomHostingStack-prod` — S3 + CloudFront (admin)
5. `FitnessRoomPortalHostingStack-prod` — S3 + CloudFront (portal)

---

## 6. Design System — Black & Gold

### CSS Variables (defined in `frontend/src/index.css`)
Theme is toggled via `data-theme="dark"` or `data-theme="light"` on `<html>`.

**Usage in Tailwind 4:**
```tsx
className="bg-[--bg-surface] text-[--tx-primary] border-[--bd-default]"
```

**Primary button (ALWAYS inline style for gradient):**
```tsx
<button style={{
  background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
  color: "var(--gold-fg)"
}}>
```

**FORBIDDEN:**
- `bg-slate-*`, `text-white`, `bg-emerald-*` → use CSS variables
- Hardcoded hex colors like `#1a1a1a` in JSX
- Tailwind color utilities instead of design tokens

### Key variables
| Variable | Purpose |
|----------|---------|
| `--bg-base/surface/elevated/muted` | Background hierarchy |
| `--bd-default/subtle` | Borders |
| `--tx-primary/muted/disabled` | Text |
| `--gold/gold-hover/gold-bg/gold-bd/gold-fg` | Brand gold |
| `--color-success/warning/danger/info` | Status colors |
| `--color-*-bg/bd` | Status backgrounds/borders |

---

## 7. i18n Rules

- **Languages**: Spanish (default) + English
- **Files**: `frontend/src/i18n/locales/es.json` and `en.json`
- **Current count**: 452 keys, 100% paridad (auditado en v1.8.5)
- **Usage**: `const { t } = useTranslation()` → `t("settings.title")`
- **RULE**: Every user-visible string MUST have a key in BOTH locale files
- **RULE**: When adding a key to one file, ALWAYS add it to the other
- **Detection**: localStorage → navigator language, fallback to `"es"`
- **Toasts exception**: hooks usan toasts en español hardcoded (es la única lengua de operación real). UI visible sí va por i18n.

### Quick paridad check

```python
import json
def flatten(d, prefix=""):
    keys = set()
    for k, v in d.items():
        full = f"{prefix}.{k}" if prefix else k
        keys |= flatten(v, full) if isinstance(v, dict) else {full}
    return keys
es = flatten(json.load(open("frontend/src/i18n/locales/es.json")))
en = flatten(json.load(open("frontend/src/i18n/locales/en.json")))
print("Missing in EN:", es - en)
print("Missing in ES:", en - es)
```

---

## 8. Code Quality Standards

### Python (Backend)
- Type hints on ALL function parameters and return types
- Pydantic v2 models for ALL request/response I/O
- Docstrings on all public functions and classes
- AWS Lambda Powertools for logging, tracing, metrics
- `ruff` for linting, `mypy` for type checking
- Verify compilation: `cd backend && python -c "from src.main import app; print('OK')"`

### TypeScript (Frontend)
- `strict: true` in tsconfig
- NO `any` type — ever
- Explicit return types on all exported functions
- Verify compilation: `cd frontend && npx tsc --noEmit`

### Error handling pattern (frontend)
```typescript
import { getApiErrorMessage } from "@/lib/apiError";

onError: (error: unknown) => {
  toast.error(getApiErrorMessage(error, "Fallback message"));
}
```
This extracts the `detail` field from FastAPI's 4xx/5xx responses and shows it to the user.

---

## 9. Business Rules

### Student statuses: `active | inactive | suspended`
- **active**: can check-in and use the gym
- **inactive**: deactivated, membership cancelled
- **suspended**: temporarily blocked (conduct/debt), membership frozen

### Cascade logic
| Action | Student Status | Membership Effect |
|--------|---------------|-------------------|
| Deactivate | → inactive | Active/frozen → cancelled |
| Suspend | → suspended | Active → frozen |
| Unsuspend | → active | Frozen → unfrozen |
| Activate | → active | No cascade (must assign new) |

### Uniqueness validation
- Email and phone must be unique across ALL entities (students + instructors)
- `UniquenessService` performs cross-entity checks on create AND update
- Returns HTTP 409 with descriptive Spanish message on conflict

### Membership types (Fitness Room León catalog — v1.7.0+)

The legacy enums (`monthly`, `quarterly`, `semi_annual`, `annual`, `founder_monthly`, `class_pack_*`, `day_pass`) were migrated in v1.7.0 to a **dynamic catalog** stored in DynamoDB and editable from the Settings UI.

Current shipped slugs:

| Slug | Duration | Classes |
|------|----------|---------|
| `founder` | 1 month | unlimited (founder program) |
| `room_daily` | 1 month | 1 / day |
| `room_elite` | 1 month | unlimited |
| `room_flex` | 1 month | unlimited + 1 paseo |
| `room_pass` | 1 day | 1 |
| `class_pack_5/10/20` | no expiry | 5 / 10 / 20 |

Add/edit from **Settings → Catálogos** in the admin panel.

### Reservation status & business rules (v1.8.5+)

`Reservation.status ∈ {confirmed, attended, no_show, cancelled, waitlisted}`.

The `attended` status:

- Counts toward `class.reservations_count` (occupancy)
- Appears in the **inscritos** list of `GET /classes/{id}/attendees` (alongside `confirmed`)
- Counts as "already booked today" for the **1-class-per-day** rule applied to `founder`, `room_daily` and `room_pass`

If you ever filter reservations to "active for the class", use:

```python
if r.status in ("confirmed", "attended", "waitlisted"):
```

Excluding `attended` was the bug fixed in v1.8.5.

---

## 10. Project Phases

| Phase | Modules | Status |
|-------|---------|--------|
| **Phase 1** | Students, Memberships, Classes, Reservations, Instructors, Check-in, Dashboard | ✅ Done |
| **Phase 2** | Email notifications (SES), Reports, Cash Register, Inventory | ✅ Done |
| **Phase 2.5** | QR Check-in, Membership freeze, PDF/Excel export, Student Portal | ✅ Done |
| **Phase 2.6** | App badges, reports overhaul (presets, transactions detail, memberships-by-range), bug fixes (v1.8.3–1.8.5) | ✅ Done |
| **Phase 3** | WhatsApp Business API, Advanced cash register | 🔜 Planned |
| **Phase 4** | Loyalty rankings, Motivation metrics, Native mobile app | 🔜 Planned |

**DO NOT implement future phases without explicit instruction.**

---

## 11. Adding a New Module (Checklist)

### Backend
1. `backend/src/models/my_module.py` — Pydantic models (Create, Update, Response, DynamoItem)
2. `backend/src/repositories/my_module_repository.py` — extends `DynamoRepository`
3. `backend/src/services/my_module_service.py` — business logic only
4. `backend/src/routers/my_module.py` — FastAPI router with OpenAPI docs
5. Register in `backend/src/main.py`: `app.include_router(router, prefix="/api/v1")`

### Frontend
1. `frontend/src/types/myModule.ts` — TypeScript types
2. `frontend/src/services/myModuleService.ts` — Axios API calls
3. `frontend/src/hooks/useMyModule.ts` — TanStack Query hooks
4. `frontend/src/routes/my-module/index.tsx` — List page
5. Add to `Sidebar.tsx` nav items
6. Add translations to BOTH `es.json` and `en.json`

---

## 12. Known Warnings

1. **GSI scans for uniqueness** — `find_by_email`/`find_by_phone` scan GSI1 with limit. Fine for <500 records. At scale, add dedicated `EMAIL#` / `PHONE#` index items.
2. **Pagination** — Most lists load `limit=200` for client-side filtering. Implement server-side pagination when entities exceed 500.
3. **DynamoDB billing** — `PAY_PER_REQUEST`. Review if exceeding 1M requests/month.
4. **Auth bypass** — When `ENVIRONMENT=local`, backend accepts `Bearer local-dev-token`. NEVER in production.
5. **Portal uses Tailwind 3** — Admin uses Tailwind 4. Do NOT mix components between apps.
6. **Portal vs Admin S3 buckets** — `fitness-room-portal-prod` vs `fitness-room-frontend-prod`. Deploying the wrong bundle to either bucket bricks logins for that audience (admin bundle in portal bucket rejects student/teacher groups). Both Login screens now show a visual badge to make this obvious. v1.8.3 was the recovery release.
7. **`Reservation.status = "attended"` counts as active** — for occupancy, attendees list, and 1-class-per-day rule. Filtering "active" reservations must use `("confirmed", "attended", "waitlisted")`. Excluding `attended` was a v1.8.4 bug fixed in v1.8.5.

---

## 13. Repo layout (post-cleanup, v1.8.5)

```
fitness-room-system/
├── README.md                # public overview
├── CLAUDE.md                # technical guide (project-level)
├── CHANGELOG.md             # Keep-a-Changelog
├── VERSION                  # 1.8.5
├── Makefile                 # make dev / make deploy / make tag
├── setup.sh                 # full bootstrap
│
├── .claude/CLAUDE.md        # this file — AI operational config
├── .windsurf/               # Windsurf rules + workflows (mirrors .claude)
├── .github/                 # placeholder; CI workflows live here
│
├── backend/                 # Python FastAPI Lambda
├── frontend/                # React 19 admin (admin.fitnessroom.mx)
├── portal/                  # React 19 portal (portal.fitnessroom.mx)
├── landing/                 # Next.js platform.fitnessroom.mx
├── gym-landing/             # Next.js fitnessroom.mx
├── infrastructure/          # AWS CDK v2 (Python)
├── maintenance/             # static HTML for maintenance mode
│
├── scripts/
│   ├── bump-version.sh, check-version.sh, maintenance.sh
│   ├── seed_data.py, seed_realistic_data.py, setup_local_db.py
│   └── legacy/              # one-shot scripts already executed (audit only)
│
└── docs/
    ├── architecture/        # overview, database-design, deployment, notification-system
    ├── flows/               # gym-operations
    ├── operacion/           # MANUAL_USUARIO, TESTING_MANUAL, COST_ANALYSIS (owner-facing)
    ├── getting-started.md, RELEASE_CHECKLIST.md, ROADMAP.md, REPO_MAP.md, TROUBLESHOOTING.md, AI_CONTEXT.md
```

What was removed in the v1.8.5 cleanup pass:

- `docs/AUDIT_FINDINGS.md` (v1.5.5 audit, all items resolved)
- `WHATSAPP_UPDATE.md` (chat snippet from a 2026-05-01 update)
- `docs/generate_word_docs.py` (script from another project, accidentally committed)
- `docker-data/` (empty local-DynamoDB scaffold dir)
- Tracked `*.tsbuildinfo` files (now gitignored)
- `.DS_Store` files

What was moved:

- `MANUAL_USUARIO.md`, `TESTING_MANUAL_DUENOS.md`, `COST_ANALYSIS.md` → `docs/operacion/`
- `scripts/migrate_types.py`, `scripts/resend_carta_responsiva.py` → `scripts/legacy/`

---

*Last updated: 2026-05-19 | v1.8.5 | Fitness Room Management System*
