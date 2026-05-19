# Repository Map — Fitness Room System

Complete directory structure and purpose of each major component.

> **Version:** 1.8.5 — last cleanup pass: 2026-05-19.

---

## Root Level

```text
fitness-room-system/
├── VERSION                  # Single source of truth (currently 1.8.5)
├── CHANGELOG.md             # Keep-a-Changelog history
├── CLAUDE.md                # Technical guide (project-level — read first)
├── README.md                # Public-facing project overview
├── Makefile                 # make dev / make deploy / make tag / etc.
├── setup.sh                 # Full bootstrap (deps for every app)
├── .envrc                   # direnv hook
├── .gitignore
├── .nvmrc                   # node 22+
├── .python-version          # 3.12
│
├── .claude/                 # AI operational config (CLAUDE.md)
├── .windsurf/               # Windsurf rules + workflows
└── .github/                 # placeholder for CI workflows
```

There are no other docs at the root anymore. User-facing manuals (`MANUAL_USUARIO`, `TESTING_MANUAL_DUENOS`, `COST_ANALYSIS`) live under `docs/operacion/`.

---

## Apps

### `backend/` — Python FastAPI Lambda

```text
backend/
├── pyproject.toml, uv.lock, requirements.txt
├── README.md
├── .env.example
├── .python-version
├── scripts/
│   └── bootstrap_admin.py        # one-off: create the first admin Cognito user
├── src/
│   ├── main.py                   # FastAPI app + Mangum handler
│   ├── config.py                 # pydantic-settings (env vars)
│   ├── routers/                  # 13 routers
│   │   ├── catalogs.py           #   /api/v1/catalogs
│   │   ├── classes.py            #   /api/v1/classes (incl. /attendees)
│   │   ├── email_admin.py        #   /api/v1/email-admin
│   │   ├── health.py             #   /health (public, source of version field)
│   │   ├── instructors.py
│   │   ├── inventory.py
│   │   ├── memberships.py
│   │   ├── notifications.py
│   │   ├── portal.py             #   /api/v1/portal/* (member-facing)
│   │   ├── reports.py            #   income, memberships-range, attendance, rankings, inactive
│   │   ├── reservations.py
│   │   ├── stats.py              #   /api/v1/stats (dashboard, N internal queries)
│   │   ├── students.py
│   │   ├── transactions.py       #   caja
│   │   └── users.py              #   Cognito user mgmt
│   ├── services/                 # business logic (15 services)
│   ├── repositories/             # DynamoDB access layer
│   ├── models/                   # Pydantic v2 (Create, Update, Response, DynamoItem)
│   └── utils/                    # auth, exceptions, phone
└── tests/                        # pytest suite (checkin, classes, memberships, …)
```

### `frontend/` — Admin Panel (admin.fitnessroom.mx)

```text
frontend/
├── package.json, pnpm-lock.yaml
├── eslint.config.js, vite.config.ts, vitest.config.ts
├── tsconfig.{json,app,node}
├── index.html
├── .env.example
└── src/
    ├── routes/                   # TanStack Router file-based
    │   ├── index.tsx             # Dashboard (/)
    │   ├── checkin.tsx, checkin-kiosk.tsx
    │   ├── login.tsx             # has "Panel Administrativo" badge + portal link
    │   ├── students/             # / + /$studentId
    │   ├── classes/, memberships/, reservations/, instructors/
    │   ├── reportes/             # 5 tabs: income/memberships/attendance/rankings/inactive
    │   ├── caja/, inventario/
    │   └── settings.tsx
    ├── components/
    │   ├── layout/               # Sidebar, AppLayout
    │   └── shared/               # 24 components (modals, dialogs, Calendar, badges, …)
    ├── hooks/                    # TanStack Query hooks (useStudents, useReports, …)
    ├── services/                 # Axios clients per entity
    ├── types/                    # TS interfaces mirroring backend
    ├── i18n/locales/             # es.json + en.json (paridad 452 keys)
    ├── store/                    # Zustand (useThemeStore, useGymStore)
    ├── config/                   # theme.ts (applyTheme)
    ├── lib/                      # utils, exportReports, dateRangePresets, changelog, apiError
    └── index.css                 # CSS design tokens (--gold, --bg-*, etc.)
```

### `portal/` — Member Portal (portal.fitnessroom.mx)

```text
portal/
├── package.json, package-lock.json
├── vite.config.ts, tailwind.config.ts (Tailwind 3.4 — NOT 4)
├── .env.example
└── src/
    ├── pages/                    # Dashboard, Profile, QR, Schedule, Login
    ├── components/               # BottomNav, Button, Card, Container, …
    ├── contexts/AuthContext.tsx  # Amplify auth
    ├── services/api.ts           # Axios → /api/v1/portal/*
    └── lib/amplify.ts            # Amplify config
```

### `landing/` — Platform landing (platform.fitnessroom.mx)

```text
landing/
├── package.json, package-lock.json
├── next.config.ts, postcss.config.mjs, amplify.yml
└── src/                          # Next.js 15 App Router pages
```

### `gym-landing/` — Gym landing (fitnessroom.mx)

```text
gym-landing/
├── package.json, package-lock.json
├── next.config.ts, eslint.config.mjs, postcss.config.mjs
├── README.md, CHECKLIST_CLIENTE.md
├── app/, lib/                    # Next.js 15 App Router
└── public/
```

### `infrastructure/` — AWS CDK v2 (Python)

```text
infrastructure/
├── buildspec-backend.yml, buildspec-frontend.yml   # CodeBuild (legacy from pipeline experiments)
├── cdk/
│   ├── app.py
│   ├── cdk.json
│   ├── requirements.txt
│   └── stacks/
│       ├── database_stack.py            # DynamoDB + S3 buckets
│       ├── auth_stack.py                # Cognito User Pool
│       ├── api_stack.py                 # Lambda + API Gateway + EventBridge
│       ├── hosting_stack.py             # S3 + CloudFront for admin
│       ├── portal_hosting_stack.py      # S3 + CloudFront for portal
│       └── pipeline_stack.py            # placeholder (not deployed)
├── lambdas/
│   └── cognito_custom_message/handler.py    # custom Cognito invite emails
└── scripts/
    ├── bootstrap.sh
    └── create_admin_user.py
```

---

## Operations

```text
scripts/
├── bump-version.sh           # bump 5 sites in sync
├── check-version.sh          # verify sync
├── maintenance.sh            # toggle maintenance mode for admin and/or portal
├── seed_data.py              # seed local DynamoDB (basic)
├── seed_realistic_data.py    # seed local DynamoDB (1-month simulation)
├── setup_local_db.py         # create local DynamoDB table with 3 GSIs
└── legacy/                   # one-shot scripts already executed in production
    ├── README.md             # describes when each ran
    ├── migrate_types.py      # v1.7.0 — old enums → dynamic catalog
    └── resend_carta_responsiva.py  # v1.7.2 — bulk-resend signed PDF

maintenance/
└── index.html                # static page deployed when maintenance mode is on
```

---

## Documentation

```text
docs/
├── AI_CONTEXT.md             # quick-start for AI assistants
├── REPO_MAP.md               # this file
├── ROADMAP.md                # what's planned + what's deferred
├── RELEASE_CHECKLIST.md      # pre-deploy checklist
├── TROUBLESHOOTING.md        # common issues
├── getting-started.md        # onboarding
├── architecture/
│   ├── overview.md           # high-level architecture
│   ├── database-design.md    # DynamoDB single-table layout
│   ├── deployment.md         # full deploy walkthrough
│   └── notification-system.md  # SES + SNS event flow
├── flows/
│   └── gym-operations.md     # business flows (check-in, reservation, …)
└── operacion/                # owner-facing manuals (Spanish)
    ├── README.md
    ├── MANUAL_USUARIO.md
    ├── TESTING_MANUAL_DUENOS.md
    └── COST_ANALYSIS.md
```

---

## What was removed in v1.8.5 cleanup

- `docs/AUDIT_FINDINGS.md` — v1.5.5 audit, all items resolved
- `WHATSAPP_UPDATE.md` — chat snippet from a 2026-05-01 release update
- `docs/generate_word_docs.py` — script from another project, accidentally committed
- `docker-data/` — empty local-DynamoDB scaffold dir
- Tracked `*.tsbuildinfo` files (now gitignored)
- `.DS_Store` files

## What was moved in v1.8.5 cleanup

- `MANUAL_USUARIO.md`, `TESTING_MANUAL_DUENOS.md`, `COST_ANALYSIS.md` → `docs/operacion/`
- `scripts/migrate_types.py`, `scripts/resend_carta_responsiva.py` → `scripts/legacy/`

---

*Last updated 2026-05-19 — v1.8.5*
