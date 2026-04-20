# Fitness Room System

Sistema integral de gestión para el estudio **Fitness Room** — serverless, AWS-native, diseñado para México.

---

## Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Stack Tecnológico](#stack-tecnológico)
- [Fases de Desarrollo](#fases-de-desarrollo)
- [Requisitos Previos](#requisitos-previos)
- [Instalación y Desarrollo Local](#instalación-y-desarrollo-local)
- [Despliegue en AWS](#despliegue-en-aws)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Variables de Entorno](#variables-de-entorno)
- [Documentación](#documentación)

---

## Arquitectura

```
Browser → CloudFront (CDN) → S3 (React SPA — Admin)
Browser → CloudFront (CDN) → S3 (React SPA — Portal)
Browser → API Gateway v2  → Lambda (FastAPI+Mangum) → DynamoDB
               ↑
          Cognito JWT Authorizer
```

**Módulos operativos (Fases 1–2.5):**

| Módulo | Descripción |
|--------|-------------|
| Check-in | Registro de entrada con validación de membresía en tiempo real + QR |
| Alumnos | Registro, perfil, historial de clases y membresías |
| Membresías | Mensual, trimestral, semestral, anual, packs de clases, freeze |
| Clases | Calendario, capacidad, lista de espera |
| Reservaciones | Asignación de alumnos a clases, asistencia |
| Instructores | Gestión del equipo de instructores |
| Dashboard | Estadísticas en tiempo real (1 llamada a API) |
| Caja | Registro de pagos, corte de caja diario |
| Inventario | Productos, ventas, alertas de stock bajo |
| Reportes | Ingresos, asistencia, rankings, alumnos inactivos |
| Portal | App para alumnos e instructores (QR, clases, reservaciones) |

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Frontend Admin** | React | 19.x |
| **Portal** | React + React Router DOM | 19.x / 7.x |
| **Lenguaje** | TypeScript | 5.7–5.9 |
| **Build Tool** | Vite | 6.x |
| **Router (admin)** | TanStack Router (file-based) | 1.x |
| **Server State** | TanStack Query | 5.x |
| **Client State** | Zustand | 5.x |
| **Styling Admin** | Tailwind CSS | 4.x + CSS Variables |
| **Styling Portal** | Tailwind CSS | 3.4.x |
| **i18n** | react-i18next | - |
| **Auth Cliente** | AWS Amplify v6 | 6.x |
| **Backend** | FastAPI | 0.115.x |
| **Lenguaje Backend** | Python | 3.12 |
| **Lambda Adapter** | Mangum | 0.19.x |
| **Validación** | Pydantic v2 | - |
| **Observabilidad** | Lambda Powertools v3 | - |
| **IaC** | AWS CDK v2 (Python) | - |
| **Auth** | AWS Cognito | - |
| **Base de Datos** | AWS DynamoDB (single-table) | - |
| **API** | API Gateway v2 (HTTP API) | - |
| **Hosting** | S3 + CloudFront (2 distribuciones) | - |
| **Email** | AWS SES | - |
| **Landing** | Next.js | 15.x |

---

## Fases de Desarrollo

| Fase | Módulos | Estado |
|------|---------|--------|
| **Fase 1** | Check-in, Alumnos, Membresías, Clases, Reservas, Instructores, Dashboard | ✅ Completado |
| **Fase 2** | Notificaciones Email (SES), Reportes financieros, Caja, Inventario | ✅ Completado |
| **Fase 2.5** | QR Check-in, Freeze membresía, Exportar PDF/Excel, Portal alumnos | ✅ Completado |
| **Fase 3** | WhatsApp Business API, Corte de caja avanzado | 🔜 Planeado |
| **Fase 4** | Rankings de fidelización, Métricas de motivación, App móvil nativa | 🔜 Planeado |

---

## Requisitos Previos

- **Node.js** >= 22.x
- **pnpm** >= 9.x (`npm install -g pnpm`)
- **Python** >= 3.12
- **uv** (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **AWS CLI** v2 configurado con perfil `salle-cajas`
- **AWS CDK CLI** >= 2.x (`npm install -g aws-cdk`)

---

## Instalación y Desarrollo Local

### Backend

```bash
cd backend
uv sync
cp .env.example .env   # edita los valores
uv run uvicorn src.main:app --reload --port 8000
```

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

### Frontend Admin

```bash
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```

- App: `http://localhost:5173`

### Portal (alumnos / instructores)

```bash
cd portal
npm install
cp .env.example .env
npm run dev
```

- Portal: `http://localhost:5174`

### Landing (sitio informativo)

```bash
cd landing
npm install
npm run dev
```

- Landing: `http://localhost:3000`

---

## Despliegue en AWS

### Infraestructura (primera vez)

```bash
cd infrastructure/cdk
pip install -r requirements.txt
cdk bootstrap --profile salle-cajas aws://948999370306/us-east-1
cdk deploy --all --profile salle-cajas
```

### Actualización de código

```bash
# Backend (Lambda)
cd backend
./scripts/deploy.sh [dev|staging|prod]

# Frontend (S3 + CloudFront)
cd frontend
pnpm build
aws s3 sync dist/ s3://fitness-room-frontend-[env] --profile salle-cajas
aws cloudfront create-invalidation --distribution-id XXXX --paths "/*" --profile salle-cajas
```

> Ver [docs/deployment/aws-setup.md](docs/deployment/aws-setup.md) para guía completa.

---

## Estructura del Proyecto

```
fitness-room-system/
├── CLAUDE.md                   # Guía para IAs y desarrolladores
├── README.md                   # Este archivo
├── MANUAL_USUARIO.md           # Manual de usuario (dueño del gimnasio)
├── Makefile                    # Comandos de desarrollo
├── .gitignore
│
├── frontend/                   # React SPA — panel de administración
│   ├── src/
│   │   ├── routes/             # Páginas (TanStack Router file-based)
│   │   ├── components/
│   │   │   ├── layout/         # Sidebar, AppLayout
│   │   │   └── shared/         # Modals, Dialog, StatusBadge, ErrorBoundary
│   │   ├── hooks/              # TanStack Query hooks
│   │   ├── services/           # Axios API services
│   │   ├── types/              # TypeScript interfaces
│   │   ├── i18n/               # Traducciones ES/EN
│   │   ├── store/              # Zustand (tema dark/light)
│   │   ├── config/             # theme.ts (applyTheme)
│   │   ├── lib/                # utils.ts (helpers)
│   │   └── index.css           # CSS variables (sistema de diseño)
│   └── package.json
│
├── portal/                     # React SPA — app alumnos/instructores
│   ├── src/
│   │   ├── pages/              # Dashboard, Profile, QR, Schedule, Login
│   │   ├── components/         # BottomNav, Button, Card, etc.
│   │   ├── contexts/           # AuthContext (Amplify)
│   │   ├── services/           # api.ts (portal endpoints)
│   │   └── lib/                # amplify.ts
│   └── package.json
│
├── backend/                    # FastAPI + Lambda
│   ├── src/
│   │   ├── main.py             # FastAPI app + Mangum handler
│   │   ├── config.py           # Settings con pydantic-settings
│   │   ├── routers/            # 12 routers (students, memberships, classes, ...)
│   │   ├── models/             # Pydantic v2 models
│   │   ├── services/           # Lógica de negocio
│   │   ├── repositories/       # DynamoDB access layer
│   │   └── utils/              # auth.py, exceptions.py
│   └── tests/                  # pytest
│
├── infrastructure/             # AWS CDK v2
│   └── cdk/
│       ├── app.py              # CDK entry point
│       └── stacks/             # DatabaseStack, AuthStack, ApiStack,
│                               # HostingStack, PortalHostingStack
│
├── landing/                    # Next.js 15 — Sitio informativo + FAQ
│   ├── src/app/                # App Router pages
│   └── amplify.yml             # Deploy config para AWS Amplify
│
└── docs/                       # Documentación técnica
    ├── architecture/
    │   ├── overview.md         # Arquitectura general
    │   └── database-design.md  # DynamoDB single-table design
    ├── flows/
    │   └── gym-operations.md   # Flujos operativos del negocio
    └── getting-started.md      # Onboarding para desarrolladores
```

---

## Variables de Entorno

### Backend (`backend/.env`)

```bash
ENVIRONMENT=local
DYNAMODB_TABLE_NAME=fitness-room-dev
DYNAMODB_ENDPOINT_URL=http://localhost:8000  # Solo local
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_REGION=us-east-1
VITE_ENV=development
```

---

## Documentación

| Documento | Audiencia | Descripción |
|-----------|-----------|-------------|
| [MANUAL_USUARIO.md](MANUAL_USUARIO.md) | Dueño / staff del gimnasio | Manual de operación completo |
| [CLAUDE.md](CLAUDE.md) | Desarrolladores / IAs | Guía técnica completa (leer primero) |
| [docs/architecture/overview.md](docs/architecture/overview.md) | Desarrolladores | Arquitectura general y decisiones técnicas |
| [docs/architecture/database-design.md](docs/architecture/database-design.md) | Desarrolladores | DynamoDB single-table design |
| [docs/flows/gym-operations.md](docs/flows/gym-operations.md) | Desarrolladores | Flujos operativos y reglas de negocio |
| [docs/getting-started.md](docs/getting-started.md) | Desarrolladores nuevos | Onboarding y setup local |

---

## Diseño y UI

- **Marca:** Negro y dorado (`--gold: #d4af37`)
- **Modos:** Oscuro (default) y claro, toggle en Configuración
- **Idiomas:** Español (default) e Inglés
- **Sistema:** CSS variables Tailwind 4 — no depende de clases hardcodeadas

---

*Desarrollado para Fitness Room — México — 2026 | Fase 2.5 completada*
