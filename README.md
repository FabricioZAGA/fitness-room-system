# Fitness Room System

Sistema integral de gestión para **Fitness Room**, un estudio de fitness en León, México. Serverless, AWS-native, multi-app.

[![Version](https://img.shields.io/badge/version-1.8.5-d4af37)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-Private-lightgrey)]()
[![Node](https://img.shields.io/badge/node-22+-339933)](.nvmrc)
[![Python](https://img.shields.io/badge/python-3.12-3776ab)](.python-version)

---

## Tabla de Contenidos

- [Qué es esto](#qué-es-esto)
- [Aplicaciones](#aplicaciones)
- [Arquitectura](#arquitectura)
- [Stack](#stack)
- [Desarrollo local](#desarrollo-local)
- [Despliegue](#despliegue)
- [Estructura del repo](#estructura-del-repo)
- [Documentación](#documentación)
- [Versionado](#versionado)

---

## Qué es esto

Plataforma para que el dueño y staff de un gimnasio operen el negocio del día a día: registrar alumnos, vender membresías, agendar y dar clases, hacer check-in, cobrar, llevar inventario, sacar reportes. Pensado y construido para el contexto mexicano (CDMX/León).

Operación en producción desde el **1 de mayo de 2026** (inauguración del studio).

---

## Aplicaciones

El monorepo contiene cinco apps desplegadas en producción:

| App | URL | Stack | Quién la usa |
|---|---|---|---|
| **Panel Administrativo** | [admin.fitnessroom.mx](https://admin.fitnessroom.mx) | React 19 + Vite 6 + Tailwind 4 | Dueño, gerencia, recepción |
| **Portal del Socio** | [portal.fitnessroom.mx](https://portal.fitnessroom.mx) | React 19 + Vite 6 + Tailwind 3 | Alumnos e instructores |
| **API** | [api.fitnessroom.mx](https://api.fitnessroom.mx) | FastAPI + AWS Lambda | Backend de admin y portal |
| **Landing del Gym** | [fitnessroom.mx](https://fitnessroom.mx) | Next.js 15 | Visitantes / marketing |
| **Landing de Plataforma** | [platform.fitnessroom.mx](https://platform.fitnessroom.mx) | Next.js 15 | Pitch a otros gimnasios |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  CloudFront (admin)  ──►  S3 ──►  React SPA (frontend/)    │
│  CloudFront (portal) ──►  S3 ──►  React SPA (portal/)      │
│  CloudFront (gym)    ──►  S3 ──►  Next static (gym-landing/)│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────────┐
              │  API Gateway v2 (api.fitnessroom) │
              │             │                     │
              │             ▼                     │
              │  Lambda — FastAPI + Mangum         │
              │   (backend/src/, prod fija)       │
              └───────────────────────────────────┘
                              │
                              ▼
                  ┌─────────────────────────┐
                  │   DynamoDB single-table │
                  │   (fitness-room-prod)   │
                  └─────────────────────────┘

  Auth: AWS Cognito (User Pool us-west-2_nErXzvgfc)
  Email: AWS SES (carta responsiva, recordatorios)
  Region: us-west-2 (datos), us-east-1 (CloudFront ACM)
```

**Single-table DynamoDB**, layered FastAPI (`router → service → repository → DynamoDB`), JWT de Cognito en cada endpoint, frontend usa CSS variables sobre Tailwind 4 para soportar dark/light mode + tema dorado.

Detalle completo: [`docs/architecture/`](docs/architecture/).

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend admin | React 19, TypeScript 5.9, Vite 6, Tailwind 4, TanStack Router/Query, Zustand, react-i18next, AWS Amplify v6 |
| Portal | React 19, TypeScript 5.9, Vite 6, Tailwind 3.4, React Router DOM 7, AWS Amplify v6 |
| Backend | Python 3.12, FastAPI 0.115, Pydantic v2, Mangum, AWS Lambda Powertools v3 |
| IaC | AWS CDK v2 (Python) |
| Datos | DynamoDB single-table + 3 GSIs |
| Auth | AWS Cognito (JWT) |
| Email | AWS SES |
| Hosting | S3 + CloudFront (3 distribuciones) |
| Landings | Next.js 15 |

---

## Desarrollo local

### Prerequisitos

| Tool | Versión | Install |
|---|---|---|
| Node.js | ≥ 22 | `brew install node` (o [.nvmrc](.nvmrc)) |
| pnpm | ≥ 9 | `npm install -g pnpm` |
| Python | 3.12 | `brew install python@3.12` |
| uv | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| AWS CLI v2 | - | configurado con perfil `salle-cajas` |
| AWS CDK | ≥ 2 | `npm install -g aws-cdk` |

### Bootstrap completo

```bash
bash setup.sh           # instala deps de todas las apps
make dev                # levanta backend + frontend + portal en paralelo
```

### Apps individuales

```bash
# Backend (FastAPI)
cd backend && uv sync && cp .env.example .env && uv run uvicorn src.main:app --reload --port 8000
# Swagger en http://localhost:8000/docs

# Admin
cd frontend && pnpm install && cp .env.example .env && pnpm dev
# http://localhost:5173

# Portal
cd portal && npm install && cp .env.example .env && npm run dev
# http://localhost:5174

# Landings
cd landing && npm install && npm run dev          # platform.fitnessroom.mx
cd gym-landing && npm install && npm run dev      # fitnessroom.mx
```

Detalle: [`docs/getting-started.md`](docs/getting-started.md).

---

## Despliegue

Producción única (sin staging — costo justificado en [`docs/operacion/COST_ANALYSIS.md`](docs/operacion/COST_ANALYSIS.md)). Todos los comandos usan `--profile salle-cajas`.

```bash
# 1. Backend (Lambda)
cd infrastructure/cdk
AWS_PROFILE=salle-cajas npx aws-cdk deploy FitnessRoomApiStack-prod --require-approval never

# 2. Admin
cd frontend && pnpm build
aws s3 sync dist/ s3://fitness-room-frontend-prod-948999370306 --delete --profile salle-cajas
aws cloudfront create-invalidation --distribution-id E1B51EPZN5PP0I --paths "/*" --profile salle-cajas

# 3. Portal
cd portal && npm run build
aws s3 sync dist/ s3://fitness-room-portal-prod-948999370306 --delete --profile salle-cajas
aws cloudfront create-invalidation --distribution-id E1VDFNEUSV0C0D --paths "/*" --profile salle-cajas

# 4. Verificar
curl -s https://api.fitnessroom.mx/health
```

Guía completa: [`docs/architecture/deployment.md`](docs/architecture/deployment.md).
Checklist pre-release: [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md).

---

## Estructura del repo

```
fitness-room-system/
├── README.md                  # este archivo
├── CHANGELOG.md               # Keep-a-Changelog, v1.8.5 al tope
├── CLAUDE.md                  # guía técnica para IAs/devs (leer primero)
├── VERSION                    # source of truth (1.8.5)
├── Makefile                   # atajos: make dev / make deploy / make tag
├── setup.sh                   # bootstrap inicial
│
├── backend/                   # FastAPI + Lambda — API Gateway v2
│   ├── src/
│   │   ├── main.py            #   FastAPI app + Mangum handler
│   │   ├── routers/           #   13 routers (students, memberships, classes…)
│   │   ├── services/          #   lógica de negocio
│   │   ├── repositories/      #   DynamoDB access
│   │   ├── models/            #   Pydantic v2
│   │   └── utils/             #   auth, exceptions
│   ├── tests/                 #   pytest
│   └── scripts/               #   bootstrap_admin.py
│
├── frontend/                  # Panel administrativo (admin.fitnessroom.mx)
│   └── src/
│       ├── routes/            #   TanStack Router file-based
│       ├── components/        #   layout/, shared/
│       ├── hooks/             #   TanStack Query hooks
│       ├── services/          #   Axios API services
│       ├── i18n/locales/      #   es.json + en.json (paridad 452 keys)
│       └── lib/               #   utils, exportReports, dateRangePresets
│
├── portal/                    # Portal del Socio (portal.fitnessroom.mx)
│   └── src/
│       ├── pages/             #   Dashboard, Profile, QR, Schedule, Login
│       ├── components/        #   BottomNav, Button, Card
│       ├── contexts/          #   AuthContext (Amplify)
│       └── services/          #   api.ts (portal endpoints)
│
├── landing/                   # platform.fitnessroom.mx (Next.js 15)
├── gym-landing/               # fitnessroom.mx (Next.js 15)
│
├── infrastructure/            # AWS CDK v2 (Python)
│   ├── cdk/
│   │   ├── app.py             #   CDK entry
│   │   └── stacks/            #   Database, Auth, Api, Hosting, PortalHosting
│   ├── lambdas/               #   cognito_custom_message
│   └── scripts/               #   bootstrap.sh, create_admin_user.py
│
├── scripts/                   # mantenimiento operativo
│   ├── bump-version.sh        #   bump y verificar 5 archivos en sync
│   ├── check-version.sh
│   ├── maintenance.sh         #   modo mantenimiento on/off
│   ├── seed_data.py           #   seed local DynamoDB
│   ├── seed_realistic_data.py
│   ├── setup_local_db.py      #   crea tabla local con 3 GSIs
│   └── legacy/                #   one-shots ya ejecutados (auditoría)
│
├── maintenance/               # página HTML para modo mantenimiento
│
└── docs/                      # documentación técnica + operativa
    ├── architecture/          #   overview, database-design, deployment, notification-system
    ├── flows/                 #   gym-operations
    ├── operacion/             #   MANUAL_USUARIO, TESTING_MANUAL, COST_ANALYSIS (para el dueño)
    ├── getting-started.md
    ├── RELEASE_CHECKLIST.md
    ├── ROADMAP.md
    ├── REPO_MAP.md
    ├── TROUBLESHOOTING.md
    └── AI_CONTEXT.md
```

---

## Documentación

### Para developers / IAs

| Documento | Cuándo leerlo |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | **Primero**. Guía técnica completa: arquitectura, design system, patrones de código, deploy. |
| [`docs/getting-started.md`](docs/getting-started.md) | Onboarding paso a paso para tu primer dev local. |
| [`docs/architecture/overview.md`](docs/architecture/overview.md) | Decisiones arquitectónicas y por qué. |
| [`docs/architecture/database-design.md`](docs/architecture/database-design.md) | Single-table DynamoDB, GSIs, access patterns. |
| [`docs/architecture/deployment.md`](docs/architecture/deployment.md) | Deploy paso a paso. |
| [`docs/architecture/notification-system.md`](docs/architecture/notification-system.md) | Email/SMS, eventos, audit log. |
| [`docs/flows/gym-operations.md`](docs/flows/gym-operations.md) | Flujos del negocio (qué pasa cuando un alumno hace check-in, etc). |
| [`docs/REPO_MAP.md`](docs/REPO_MAP.md) | Mapa exhaustivo de directorios. |
| [`docs/AI_CONTEXT.md`](docs/AI_CONTEXT.md) | Contexto rápido para IAs. |
| [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) | Antes de un deploy a prod. |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Errores comunes y cómo destrancarse. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Qué viene y qué quedó parqueado. |

### Para el dueño / staff

| Documento | Para qué |
|---|---|
| [`docs/operacion/MANUAL_USUARIO.md`](docs/operacion/MANUAL_USUARIO.md) | Operación diaria del sistema, módulo por módulo. |
| [`docs/operacion/TESTING_MANUAL_DUENOS.md`](docs/operacion/TESTING_MANUAL_DUENOS.md) | Validar cada flujo después de un release. |
| [`docs/operacion/COST_ANALYSIS.md`](docs/operacion/COST_ANALYSIS.md) | Costo de la infra y ROI con datos de Cost Explorer. |

---

## Versionado

Versión actual: **1.8.5** ([CHANGELOG.md](CHANGELOG.md)).

Cinco lugares deben mantenerse en sync (validado por `make check-version`):

| # | Archivo | Campo |
|---|---|---|
| 1 | [`VERSION`](VERSION) | texto plano |
| 2 | [`frontend/package.json`](frontend/package.json) | `"version"` |
| 3 | [`frontend/src/lib/changelog.ts`](frontend/src/lib/changelog.ts) | `APP_VERSION` + nueva entrada al inicio |
| 4 | [`backend/src/routers/health.py`](backend/src/routers/health.py) | `version=` en `HealthResponse` |
| 5 | [`CHANGELOG.md`](CHANGELOG.md) | nueva sección `## [x.y.z]` |

```bash
./scripts/bump-version.sh 1.9.0   # actualiza los 5 sitios
./scripts/check-version.sh        # verifica sync
make tag                          # crea tag v1.9.0
```

---

## Diseño visual

- **Marca:** negro y dorado (`--gold: #d4af37`).
- **Modos:** oscuro (default) y claro, toggle en Configuración.
- **Idiomas:** español (default) e inglés — 452 keys con paridad total.
- **Tema:** CSS variables sobre Tailwind 4. Nada hardcodeado en JSX.

---

*Fitness Room — León, México — © 2026*
