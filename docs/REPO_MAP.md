# Repository Map — Fitness Room System

Complete directory structure and purpose of each major component.

---

## Root Level

```
fitness-room-system/
├── VERSION              # Single source of truth for version (1.5.5)
├── CHANGELOG.md         # Keep-a-Changelog format history
├── CLAUDE.md            # AI assistant instructions
├── README.md            # Project overview
├── MANUAL_USUARIO.md    # Spanish user manual
├── Makefile             # Build/deploy shortcuts
├── .envrc               # direnv config (auto-load env)
│
├── backend/             # Python FastAPI serverless API
├── frontend/            # React admin panel (Vite + TanStack Router)
├── portal/              # React student portal (Vite + React Router)
├── landing/             # Next.js platform landing page
├── gym-landing/         # Next.js gym landing page
├── infrastructure/      # AWS CDK stacks
├── docs/                # Technical documentation
├── scripts/             # Utility scripts
│
├── .claude/             # Claude Code config
├── .windsurf/           # Windsurf AI rules
└── .github/             # GitHub workflows
```

---

## Backend (`/backend/`)

Python 3.12 + FastAPI + AWS Lambda serverless API.

```
backend/
├── pyproject.toml       # Dependencies, ruff, mypy config
├── .env.example         # Environment template
│
├── src/
│   ├── main.py          # FastAPI app, Mangum handler
│   ├── config.py        # Settings from environment
│   │
│   ├── models/          # Pydantic v2 schemas
│   │   ├── student.py       # Student, StudentCreate, StudentResponse
│   │   ├── membership.py    # Membership types, statuses
│   │   ├── class_model.py   # Class scheduling
│   │   ├── instructor.py    # Instructor profiles
│   │   ├── reservation.py   # Class reservations
│   │   ├── checkin.py       # Check-in records
│   │   ├── transaction.py   # Payment records
│   │   ├── inventory.py     # Products, sales
│   │   ├── notification.py  # Email notification logs
│   │   └── common.py        # Shared response types
│   │
│   ├── repositories/    # DynamoDB data access layer
│   │   ├── dynamo_repository.py  # Base class with common ops
│   │   ├── student_repository.py
│   │   ├── membership_repository.py
│   │   ├── class_repository.py
│   │   ├── instructor_repository.py
│   │   ├── reservation_repository.py
│   │   ├── transaction_repository.py
│   │   ├── inventory_repository.py
│   │   └── notification_repository.py
│   │
│   ├── services/        # Business logic layer
│   │   ├── student_service.py      # Student CRUD + status mgmt
│   │   ├── membership_service.py   # Memberships, freeze/unfreeze
│   │   ├── class_service.py        # Class scheduling
│   │   ├── instructor_service.py   # Instructor mgmt
│   │   ├── reservation_service.py  # Booking logic
│   │   ├── checkin_service.py      # Check-in validation
│   │   ├── transaction_service.py  # Payments, cash register
│   │   ├── inventory_service.py    # Products, stock
│   │   ├── cognito_service.py      # User creation, groups
│   │   ├── event_notifier.py       # Email sending via SES
│   │   ├── email_templates.py      # HTML email templates
│   │   ├── carta_responsiva.py     # PDF generation
│   │   ├── notification_service.py # Scheduled notifications
│   │   ├── report_service.py       # Financial reports
│   │   └── uniqueness_service.py   # Cross-entity validation
│   │
│   ├── routers/         # FastAPI route handlers
│   │   ├── health.py        # GET /health (public)
│   │   ├── stats.py         # GET /api/v1/stats (dashboard)
│   │   ├── students.py      # /api/v1/students/*
│   │   ├── memberships.py   # /api/v1/memberships/*
│   │   ├── classes.py       # /api/v1/classes/*
│   │   ├── instructors.py   # /api/v1/instructors/*
│   │   ├── reservations.py  # /api/v1/reservations/*
│   │   ├── transactions.py  # /api/v1/transactions/*
│   │   ├── inventory.py     # /api/v1/inventory/*
│   │   ├── reports.py       # /api/v1/reports/*
│   │   ├── notifications.py # /api/v1/notifications/*
│   │   ├── users.py         # /api/v1/users/* (Cognito mgmt)
│   │   └── portal.py        # /api/v1/portal/* (student APIs)
│   │
│   ├── utils/           # Shared utilities
│   │   ├── auth.py          # JWT validation, role checks
│   │   ├── exceptions.py    # Custom HTTP exceptions
│   │   └── phone.py         # Phone number formatting
│   │
│   └── assets/          # Static assets (email logos, etc.)
│
├── scripts/
│   └── bootstrap_admin.py  # Create first admin user
│
└── tests/               # pytest tests
    ├── conftest.py          # Fixtures, moto mocks
    ├── test_students.py
    ├── test_memberships.py
    ├── test_classes.py
    ├── test_reservations.py
    └── test_checkin.py
```

---

## Admin Frontend (`/frontend/`)

React 19 admin panel with TanStack Router (file-based routing).

```
frontend/
├── package.json         # v1.5.5, Vite 6, React 19
├── vite.config.ts       # Vite + TanStack Router plugin
├── tsconfig.json        # Strict TypeScript
├── eslint.config.js     # ESLint 9 flat config
├── tailwind.config.ts   # Tailwind CSS 4
├── .env.example         # Vite env template
│
└── src/
    ├── main.tsx         # App entry point
    ├── index.css        # CSS custom properties (design tokens)
    ├── routeTree.gen.ts # Auto-generated routes (do not edit)
    │
    ├── routes/          # File-based pages (TanStack Router)
    │   ├── __root.tsx       # Root layout with Sidebar
    │   ├── index.tsx        # Dashboard (/)
    │   ├── login.tsx        # Login page
    │   ├── checkin.tsx      # Check-in flow
    │   ├── checkin-kiosk.tsx # Kiosk mode
    │   ├── settings.tsx     # Settings page
    │   ├── students/
    │   │   ├── index.tsx    # Student list
    │   │   └── $studentId/
    │   │       └── index.tsx # Student detail
    │   ├── memberships/
    │   │   └── index.tsx    # Memberships list
    │   ├── classes/
    │   │   └── index.tsx    # Classes schedule
    │   ├── instructors/
    │   │   └── index.tsx    # Instructors list
    │   ├── reservations/
    │   │   └── index.tsx    # Reservations
    │   ├── users/
    │   │   └── index.tsx    # Cognito user management
    │   ├── caja/
    │   │   └── index.tsx    # Cash register
    │   ├── reportes/
    │   │   └── index.tsx    # Reports
    │   └── inventario/
    │       └── index.tsx    # Inventory
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx      # Navigation sidebar
    │   │   └── AppLayout.tsx    # Authenticated layout
    │   └── shared/
    │       ├── Dialog.tsx           # Modal base
    │       ├── StatusBadge.tsx      # Status pills
    │       ├── ErrorBoundary.tsx    # Error handling
    │       ├── CreateStudentModal.tsx
    │       ├── EditStudentModal.tsx
    │       ├── CreateInstructorModal.tsx
    │       ├── EditInstructorModal.tsx
    │       ├── CreateUserModal.tsx
    │       ├── PhoneInput.tsx       # E.164 phone input
    │       ├── AddressInput.tsx     # Structured address
    │       └── CameraCapture.tsx    # Webcam photo
    │
    ├── hooks/           # TanStack Query hooks
    │   ├── useStudents.ts
    │   ├── useClasses.ts
    │   ├── useMemberships.ts
    │   ├── useInstructors.ts
    │   ├── useReservations.ts
    │   ├── useStats.ts
    │   ├── useUsers.ts
    │   └── ...
    │
    ├── services/        # Axios API clients
    │   ├── apiClient.ts     # Configured Axios instance
    │   ├── studentService.ts
    │   ├── classService.ts
    │   ├── membershipService.ts
    │   └── ...
    │
    ├── types/           # TypeScript interfaces
    │   ├── student.ts
    │   ├── membership.ts
    │   ├── class.ts
    │   ├── instructor.ts
    │   └── ...
    │
    ├── contexts/
    │   └── AuthContext.tsx  # Cognito auth state
    │
    ├── i18n/
    │   ├── index.ts         # i18next config
    │   └── locales/
    │       ├── es.json      # Spanish translations
    │       └── en.json      # English translations
    │
    ├── store/
    │   └── useThemeStore.ts # Zustand theme store
    │
    ├── lib/
    │   ├── utils.ts         # cn(), formatDate(), etc.
    │   ├── changelog.ts     # Version history
    │   ├── phone.ts         # Phone validation
    │   ├── address.ts       # Address parsing
    │   ├── specialties.ts   # Instructor specialties
    │   └── userGroups.ts    # Cognito groups
    │
    └── config/
        └── theme.ts         # Theme application
```

---

## Student Portal (`/portal/`)

React 19 member-facing app with React Router DOM 7.

```
portal/
├── package.json         # v1.5.5, Vite 6, Tailwind 3
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js     # ESLint 9 config
├── tailwind.config.js   # Tailwind CSS 3
│
└── src/
    ├── main.tsx
    ├── App.tsx              # React Router setup
    ├── index.css
    │
    ├── pages/
    │   ├── Login.tsx        # Auth flow
    │   ├── Dashboard.tsx    # Home screen
    │   ├── Profile.tsx      # User profile
    │   ├── QR.tsx           # Personal QR code
    │   └── Schedule.tsx     # Class schedule
    │
    ├── components/
    │   ├── BottomNav.tsx    # Mobile navigation
    │   ├── Button.tsx
    │   ├── Card.tsx
    │   ├── Container.tsx
    │   └── LoadingSpinner.tsx
    │
    ├── contexts/
    │   └── AuthContext.tsx  # Amplify auth
    │
    ├── services/
    │   └── api.ts           # Portal API client
    │
    ├── hooks/
    │   └── usePortalProfile.ts
    │
    └── lib/
        └── amplify.ts       # AWS Amplify config
```

---

## Infrastructure (`/infrastructure/`)

AWS CDK v2 infrastructure as code.

```
infrastructure/
├── cdk/
│   ├── app.py               # CDK app entry
│   ├── cdk.json             # CDK config
│   ├── requirements.txt     # CDK Python deps
│   │
│   └── stacks/
│       ├── database_stack.py        # DynamoDB table
│       ├── auth_stack.py            # Cognito User Pool
│       ├── api_stack.py             # Lambda + API Gateway
│       ├── hosting_stack.py         # S3 + CloudFront (admin)
│       ├── portal_hosting_stack.py  # S3 + CloudFront (portal)
│       └── pipeline_stack.py        # CI/CD pipeline
│
├── lambdas/
│   └── cognito_custom_message/
│       └── handler.py       # Custom email templates
│
└── scripts/
    └── create_admin_user.py # Admin bootstrap
```

---

## Documentation (`/docs/`)

```
docs/
├── AI_CONTEXT.md            # Quick-start for AI assistants
├── REPO_MAP.md              # This file
├── AUDIT_FINDINGS.md        # Audit report
├── getting-started.md       # Setup guide
│
├── architecture/
│   ├── overview.md          # System architecture
│   ├── database-design.md   # DynamoDB schema
│   ├── deployment.md        # Deploy procedures
│   └── notification-system.md
│
└── flows/
    └── gym-operations.md    # Business workflows
```

---

## Key Config Files

| File | Purpose |
|------|---------|
| `/VERSION` | Master version number |
| `/CLAUDE.md` | AI assistant rules |
| `/.claude/settings.local.json` | Claude Code settings |
| `/frontend/.env.production` | Prod env vars |
| `/portal/.env.production` | Portal prod env |
| `/backend/.env` | Local backend env |

---

*Generated 2026-04-24 | v1.5.5*
