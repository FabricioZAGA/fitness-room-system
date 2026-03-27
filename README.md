# 🏋️ Fitness Room System

Sistema integral de gestión para el estudio **Fitness Room** — 100% serverless, AWS-native, y diseñado para escalar.

---

## 📋 Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Stack Tecnológico](#stack-tecnológico)
- [Fases de Desarrollo](#fases-de-desarrollo)
- [Requisitos Previos](#requisitos-previos)
- [Configuración Inicial](#configuración-inicial)
- [Desarrollo Local](#desarrollo-local)
- [Despliegue](#despliegue)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Documentación](#documentación)
- [Contribuir](#contribuir)

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        FITNESS ROOM SYSTEM                       │
├──────────────────┬──────────────────────┬───────────────────────┤
│   FRONTEND       │      BACKEND          │    INFRASTRUCTURE     │
│  React 19 + TS   │   FastAPI + Lambda   │   AWS CDK v2 (Python) │
│  Vite 6          │   Python 3.12        │   DynamoDB            │
│  TanStack Router │   API Gateway v2     │   Cognito             │
│  shadcn/ui       │   Lambda Powertools  │   S3 + CloudFront     │
│  Tailwind v4     │   Pydantic v2        │   GitHub Actions      │
└──────────────────┴──────────────────────┴───────────────────────┘
```

**Flujo de request:**
```
Browser → CloudFront (CDN) → S3 (React App)
                           ↓
Browser → API Gateway v2 → Lambda (FastAPI+Mangum) → DynamoDB
              ↑
         Cognito JWT Authorizer
```

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Frontend Framework** | React | 19.x |
| **Lenguaje Frontend** | TypeScript | 5.7.x |
| **Build Tool** | Vite | 6.x |
| **Router** | TanStack Router | 1.x |
| **Server State** | TanStack Query | 5.x |
| **Client State** | Zustand | 5.x |
| **UI Components** | shadcn/ui | latest |
| **Styling** | Tailwind CSS | 4.x |
| **Backend Framework** | FastAPI | 0.115.x |
| **Lenguaje Backend** | Python | 3.12 |
| **Lambda Adapter** | Mangum | 0.19.x |
| **Validación** | Pydantic | 2.x |
| **Observabilidad** | Lambda Powertools | 3.x |
| **IaC** | AWS CDK | v2 |
| **Auth** | AWS Cognito | - |
| **Base de Datos** | AWS DynamoDB | - |
| **API** | API Gateway v2 | HTTP API |
| **Hosting Frontend** | S3 + CloudFront | - |
| **CI/CD** | GitHub Actions | - |

---

## Fases de Desarrollo

| Fase | Módulos | Estado |
|------|---------|--------|
| **Fase 1** | Alumnos, Membresías, Reservas de Clases | ✅ En desarrollo |
| **Fase 2** | Comunicación (WhatsApp/Email), Reportes | 🔜 Planeado |
| **Fase 3** | Corte de Caja, Inventario | 🔜 Planeado |
| **Fase 4** | Extras (Rankings, Motivación, Alertas) | 🔜 Planeado |

---

## Requisitos Previos

- **Node.js** >= 22.x
- **Python** >= 3.12
- **AWS CLI** v2 configurado con perfil `salle-cajas`
- **AWS CDK CLI** >= 2.x (`npm install -g aws-cdk`)
- **pnpm** >= 9.x (`npm install -g pnpm`)
- **uv** (Python package manager) (`curl -LsSf https://astral.sh/uv/install.sh | sh`)

---

## Configuración Inicial

### 1. Clonar el repositorio

```bash
git clone https://github.com/FabricioZAGA/fitness-room-system.git
cd fitness-room-system
```

### 2. Configurar AWS Profile

```bash
# Verificar que el perfil salle-cajas existe
aws configure list-profiles
# Si no existe, configurarlo:
aws configure --profile salle-cajas
```

### 3. Bootstrap CDK (solo primera vez)

```bash
cd infrastructure/cdk
pip install -r requirements.txt
cdk bootstrap --profile salle-cajas aws://948999370306/us-east-1
```

### 4. Instalar dependencias

```bash
# Desde la raíz del proyecto
make install
```

### 5. Configurar variables de entorno

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

---

## Desarrollo Local

```bash
# Levantar todo (backend + frontend)
make dev

# Solo backend
make dev-backend

# Solo frontend
make dev-frontend

# Tests
make test

# Linting
make lint
```

### Backend disponible en:
- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Frontend disponible en:
- `http://localhost:5173`

---

## Despliegue

```bash
# Desplegar infraestructura
make deploy-infra ENV=dev

# Desplegar backend (Lambda)
make deploy-backend ENV=dev

# Desplegar frontend (S3 + CloudFront)
make deploy-frontend ENV=dev

# Desplegar todo
make deploy ENV=dev
```

> 📖 Ver [docs/deployment/aws-setup.md](docs/deployment/aws-setup.md) para guía completa.

---

## Estructura del Proyecto

```
fitness-room-system/
├── .github/                    # GitHub Actions CI/CD
│   └── workflows/
├── .windsurf/                  # Windsurf AI config (workflows, rules)
│   ├── workflows/
│   └── rules/
├── infrastructure/             # AWS CDK v2 (Python)
│   ├── cdk/
│   │   ├── app.py              # CDK app entry point
│   │   └── stacks/             # CloudFormation stacks
│   └── scripts/                # Deploy scripts
├── backend/                    # FastAPI + Lambda
│   ├── src/
│   │   ├── main.py             # FastAPI app + Mangum handler
│   │   ├── routers/            # API endpoints por módulo
│   │   ├── models/             # Pydantic models
│   │   ├── services/           # Business logic
│   │   ├── repositories/       # DynamoDB access layer
│   │   └── utils/              # Helpers, auth, exceptions
│   └── tests/                  # Pytest tests
├── frontend/                   # React 19 + TypeScript
│   ├── src/
│   │   ├── routes/             # TanStack Router pages
│   │   ├── components/         # UI components
│   │   │   ├── ui/             # shadcn/ui base components
│   │   │   ├── layout/         # Layout components
│   │   │   └── shared/         # Shared business components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API service layer
│   │   ├── store/              # Zustand stores
│   │   ├── types/              # TypeScript types/interfaces
│   │   └── config/             # App config (theme, etc.)
│   └── public/
├── docs/                       # Documentación completa
│   ├── architecture/
│   ├── development/
│   └── deployment/
├── Makefile                    # Comandos principales
└── README.md
```

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [Arquitectura General](docs/architecture/overview.md) | Decisiones arquitectónicas y diagramas |
| [Diseño de Base de Datos](docs/architecture/database-design.md) | DynamoDB single-table design |
| [Guía de Inicio](docs/development/getting-started.md) | Onboarding para nuevos desarrolladores |
| [Guía de Backend](docs/development/backend-guide.md) | Estructura y patrones del backend |
| [Guía de Frontend](docs/development/frontend-guide.md) | Estructura y patrones del frontend |
| [Configuración AWS](docs/deployment/aws-setup.md) | Setup inicial de AWS |
| [CI/CD](docs/deployment/ci-cd.md) | Pipelines de GitHub Actions |

---

## Contribuir

1. Leer [docs/development/getting-started.md](docs/development/getting-started.md)
2. Crear rama con prefijo: `fzacarias/fire-XXXX/descripcion`
3. Usar **Conventional Commits**: `feat:`, `fix:`, `docs:`, `chore:`, etc.
4. Abrir Pull Request con template incluido
5. Pasar todos los checks de CI

---

## Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `AWS_PROFILE` | Perfil AWS (`salle-cajas`) | ✅ |
| `AWS_ACCOUNT_ID` | ID de cuenta AWS (`948999370306`) | ✅ |
| `AWS_REGION` | Región AWS (`us-east-1`) | ✅ |
| `ENVIRONMENT` | Ambiente (`dev`, `staging`, `prod`) | ✅ |
| `COGNITO_USER_POOL_ID` | ID del User Pool de Cognito | ✅ |
| `COGNITO_CLIENT_ID` | Client ID de Cognito | ✅ |
| `DYNAMODB_TABLE_NAME` | Nombre de la tabla DynamoDB | ✅ |

---

*Desarrollado con ❤️ para Fitness Room — 2026*
