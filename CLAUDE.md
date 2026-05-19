# CLAUDE.md — Fitness Room System

Guía para IAs y desarrolladores que trabajen en este proyecto.
**Lee esto antes de modificar cualquier cosa.** Para detalle de operaciones (deploy, versionado, infra) ver [`.claude/CLAUDE.md`](.claude/CLAUDE.md).

> **Versión actual:** 1.8.5 — Operación en producción desde 2026-05-01.

---

## Qué es este proyecto

Sistema de gestión integral para **Fitness Room**, un estudio de fitness en León, México.
Gestiona alumnos, membresías, clases, instructores, check-in, caja, inventario y reportes.

**Stack** (resumen — detalle en [README.md](README.md)):

| Capa | Tech |
|---|---|
| **Admin** (`/frontend/`) | React 19 + TypeScript + Vite 6 + Tailwind 4 + TanStack Router/Query |
| **Portal** (`/portal/`) | React 19 + TypeScript + Vite 6 + Tailwind 3.4 + React Router DOM 7 |
| **Backend** (`/backend/`) | Python 3.12 + FastAPI + Pydantic v2 + DynamoDB + AWS Lambda |
| **Infra** (`/infrastructure/`) | AWS CDK v2 (Python) |
| **Landings** (`/landing/`, `/gym-landing/`) | Next.js 15 + Tailwind 4 |

---

## Arquitectura de alto nivel

```
Browser → CloudFront → S3 (React SPAs)
        → API Gateway v2 → Lambda (FastAPI+Mangum) → DynamoDB
              ↑
         Cognito JWT
```

**Regla de oro:** El backend es serverless puro. Toda la lógica vive en `services/`. Los routers solo validan y delegan. Los repositories son la única capa que toca DynamoDB.

---

## Cómo correr en local

```bash
# Bootstrap inicial (una sola vez)
bash setup.sh

# Levantar todo en paralelo
make dev
```

Apps individuales:

| App | Comando | URL |
|---|---|---|
| Backend | `cd backend && uv run uvicorn src.main:app --reload --port 8000` | http://localhost:8000/docs |
| Admin | `cd frontend && pnpm dev` | http://localhost:5173 |
| Portal | `cd portal && npm run dev` | http://localhost:5174 |
| Landing | `cd landing && npm run dev` | http://localhost:3000 |

---

## Estructura del frontend (admin)

```
frontend/src/
  routes/              # Pages — TanStack Router (file-based)
    index.tsx              # Dashboard (/)
    checkin.tsx            # Check-in (/checkin)
    checkin-kiosk.tsx      # Modo kiosco pantalla grande
    login.tsx              # Login (/login) — con badge "Panel Administrativo"
    students/              # /students y /students/$studentId
    classes/               # /classes — calendario + detalle
    memberships/           # /memberships — pestañas activas/vencidas/etc
    reservations/          # /reservations
    instructors/           # /instructors
    reportes/              # /reportes — 5 tabs (income/memberships/attendance/rankings/inactive)
    caja/                  # /caja — cobros y corte de caja
    inventario/            # /inventario — productos y ventas
    settings.tsx           # /settings
  components/
    layout/                # Sidebar, AppLayout
    shared/                # Modals, StatusBadge, Dialog, ClassCalendar, etc.
  hooks/                   # TanStack Query hooks (useStudents, useClasses, useReports, ...)
  services/                # Axios API calls
  types/                   # TypeScript interfaces
  i18n/locales/            # es.json + en.json (paridad 452 keys)
  store/                   # Zustand (useThemeStore, useGymStore)
  config/                  # theme.ts (applyTheme)
  lib/                     # utils, exportReports, dateRangePresets, changelog
  index.css                # CSS design tokens
```

## Estructura del portal (alumnos / instructores)

App React independiente con React Router DOM 7 (no TanStack).

```
portal/src/
  pages/
    Dashboard.tsx          # Bienvenida, acceso rápido, membresía actual
    Profile.tsx            # Datos personales del usuario
    QR.tsx                 # Código QR personal para check-in
    Schedule.tsx           # Clases disponibles, reservaciones propias
    Login.tsx              # Login con Cognito + badge "Portal del Socio"
  components/              # BottomNav, Button, Card, Container, etc.
  contexts/AuthContext.tsx # Amplify auth — login, logout
  services/api.ts          # Axios → /api/v1/portal/*
  lib/amplify.ts           # Configuración de AWS Amplify
```

**Endpoints del portal** (todos bajo `/api/v1/portal/`):

```
GET    /profile              perfil del usuario
GET    /membership           membresía activa
GET    /qr                   código QR personal
GET    /classes              clases disponibles próximas
GET    /classes/{id}/attendees   asistentes (estilo "first + L.")
GET    /reservations         mis reservaciones
POST   /reservations         reservar una clase
DELETE /reservations/{class_id}  cancelar reservación
GET    /checkins             historial de check-ins
```

---

## Sistema de diseño — Negro & Dorado

**Variables CSS** (definidas en `frontend/src/index.css`). Toggle dark/light vía `data-theme="dark"|"light"` en `<html>`.

| Variable | Uso |
|---|---|
| `--bg-base` | Fondo principal de página |
| `--bg-surface` | Tarjetas y paneles |
| `--bg-elevated` | Modals y dropdowns |
| `--bg-muted` | Inputs, superficies sutiles |
| `--bd-default` / `--bd-subtle` | Bordes |
| `--tx-primary` / `--tx-muted` / `--tx-disabled` | Texto |
| `--gold` / `--gold-hover` / `--gold-bg` / `--gold-bd` / `--gold-fg` | Dorado de marca |
| `--color-success` / `warning` / `danger` / `info` | Estados (+ `-bg`/`-bd`) |

**Uso en Tailwind 4:**
```tsx
className="bg-[--bg-surface] text-[--tx-primary] border-[--bd-default]"
```

**Botón primario** (siempre inline style para el gradiente):
```tsx
<button
  style={{
    background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)",
    color: "var(--gold-fg)",
  }}
>
```

**NUNCA usar:**
- `bg-slate-*`, `text-white`, `bg-emerald-*`, `text-green-*` — usar variables CSS
- Colores hardcodeados como `#1a1a1a` en JSX

---

## Patrones de backend

### Estructura por módulo (capas obligatorias)

```
routers/students.py           → validación + HTTP, delega a service
services/student_service.py   → lógica de negocio, llama a repository
repositories/student_repository.py  → único lugar que toca DynamoDB
models/student.py             → Pydantic v2 (Create, Update, Response, DynamoItem)
```

**NUNCA** llamar boto3/DynamoDB directamente desde un service o router.

### DynamoDB single-table

| Entidad | PK | SK |
|---|---|---|
| Student | `STUDENT#{id}` | `PROFILE` |
| Membership | `STUDENT#{id}` | `MEMBERSHIP#{id}` |
| Reservation | `CLASS#{id}` | `RESERVATION#{student_id}` |
| Class | `CLASS#{id}` | `METADATA` |
| Instructor | `INSTRUCTOR#{id}` | `PROFILE` |
| Checkin | `STUDENT#{id}` | `CHECKIN#{datetime}` |
| Transaction | `TRANSACTION#{id}` | `METADATA` |
| Product | `PRODUCT#{id}` | `METADATA` |
| Sale | `SALE#{id}` | `METADATA` |

**GSIs:**
- `GSI1`: EntityType + SK — listar por tipo
- `GSI2`: InstructorId + ClassDate — clases por instructor (también: GSI2 sobre transacciones por alumno)
- `GSI3`: ClassDate + StartTime — clases por fecha; también flag de membresía activa por alumno

### Auth

Endpoints protegidos requieren `_current_user: dict = Depends(get_current_user)`.
`/health` es público.

---

## Patrones de frontend

### Hooks de TanStack Query

```tsx
export function useStudents(params?: { status?: StudentStatus; limit?: number }) {
  return useQuery({
    queryKey: ["students", params],
    queryFn: () => studentService.list(params),
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      toast.success("Alumno creado exitosamente");
    },
    onError: () => toast.error("Error al crear alumno"),
  });
}
```

### Servicios API (Axios)

```tsx
export const studentService = {
  list: (params?) => apiClient.get<PaginatedResponse<Student>>("/students", { params }),
  getById: (id) => apiClient.get<Student>(`/students/${id}`),
  create: (data) => apiClient.post<Student>("/students", data),
  update: (id, data) => apiClient.patch<Student>(`/students/${id}`, data),
};
```

### Modals

Usan `<Dialog>` de `components/shared/Dialog.tsx`. Los inputs siempre con la clase local:
```tsx
const inputCls = "w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";
```

---

## i18n

- Idiomas: **español (default)** e **inglés**
- Archivos: `frontend/src/i18n/locales/es.json` y `en.json`
- **Paridad obligatoria**: 452 keys actualmente. Si agregas una clave en un archivo, agrégala en el otro.
- Uso: `const { t } = useTranslation()` → `t("settings.title")`
- Detección: localStorage → navigator, fallback a `"es"`
- Verificación rápida:
  ```bash
  cd frontend && python3 -c "
  import json
  es = set(open('src/i18n/locales/es.json').read())
  en = set(open('src/i18n/locales/en.json').read())
  # ... (script en .claude/CLAUDE.md sección i18n)
  "
  ```

**Toasts** son una excepción consciente: están en español hardcoded en hooks (es la única lengua de operación real). UI visible sí usa i18n.

---

## Flujos críticos (contexto México)

### Check-in (operación más frecuente)

1. Recepcionista abre `/checkin`
2. Teclea ≥ 2 letras del nombre o escanea QR
3. Dropdown con hasta 10 resultados
4. Click → panel derecho muestra estado
5. Verde ✅ acceso, ámbar ⚠️ acceso pero por vencer, rojo ❌ denegado
6. "Registrar Check-in" → `POST /students/{id}/checkin`

**Reglas de acceso:**
- status `active` ✓
- Membresía activa con `days_until_expiry > 0` ✓
- Para Founder/Room Daily/Room Pass: máx 1 clase/día (incluye `attended` ya marcadas)

### Membresías Fitness Room León (catálogo dinámico v1.7.0+)

| Slug | Duración | Clases | Precio sugerido |
|---|---|---|---|
| `founder` | 1 mes | sin límite | (programa fundador) |
| `room_daily` | 1 mes | 1/día | — |
| `room_elite` | 1 mes | sin límite | — |
| `room_flex` | 1 mes | sin límite + paseo | — |
| `room_pass` | 1 día | 1 | — |
| `class_pack_5/10/20` | sin fecha | 5/10/20 | — |

Todos editables desde **Configuración → Catálogos**.

### Alertas de vencimiento

- 7 días (crítico) y 30 días (aviso) en el dashboard
- `GET /api/v1/memberships/expiring?days=7` y `?days=30`
- EventBridge dispara recordatorios SES diariamente

---

## Endpoints API (resumen)

```
GET  /health                              ping (público)
GET  /api/v1/stats                        dashboard

# Alumnos
GET/POST/PATCH/DELETE /api/v1/students[/{id}]
POST /api/v1/students/{id}/activate|deactivate|suspend|unsuspend|checkin
GET  /api/v1/students/{id}/qr             QR base64 PNG

# Membresías
GET/POST/PATCH /api/v1/memberships[/{id}]
GET  /api/v1/memberships/expiring         por vencer
POST /api/v1/memberships/{id}/cancel|renew
POST /api/v1/memberships/student/{id}/{mid}/freeze|unfreeze

# Clases
GET/POST/PATCH /api/v1/classes[/{id}]
GET  /api/v1/classes/{id}/attendees       inscritos confirmed+attended+waitlisted
POST /api/v1/classes/{id}/cancel

# Reservaciones
GET/POST/DELETE /api/v1/reservations[/{id}]
POST /api/v1/reservations/{id}/attend

# Instructores
GET/POST/PATCH /api/v1/instructors[/{id}]
POST /api/v1/instructors/{id}/activate|deactivate

# Caja
POST /api/v1/transactions, GET /api/v1/transactions
GET  /api/v1/transactions/student/{id}
GET  /api/v1/transactions/daily-summary
POST /api/v1/transactions/cash-cut

# Inventario
POST/GET/PATCH /api/v1/inventory/products[/{id}]
GET  /api/v1/inventory/products/low-stock
POST /api/v1/inventory/products/{id}/restock|sell
GET  /api/v1/inventory/sales

# Reportes (v1.8.4+)
GET  /api/v1/reports/income[?include_transactions=true]
GET  /api/v1/reports/memberships-range
GET  /api/v1/reports/attendance[?days|start_date+end_date]
GET  /api/v1/reports/rankings[?days|start_date+end_date]
GET  /api/v1/reports/inactive             (incluye last_checkin)

# Portal
GET    /api/v1/portal/profile
GET    /api/v1/portal/membership
GET    /api/v1/portal/qr
GET    /api/v1/portal/classes
GET    /api/v1/portal/classes/{id}/attendees
GET    /api/v1/portal/reservations
POST   /api/v1/portal/reservations
DELETE /api/v1/portal/reservations/{class_id}
GET    /api/v1/portal/checkins
```

---

## Variables de entorno

### Backend (`backend/.env`)
```bash
ENVIRONMENT=local
DYNAMODB_TABLE_NAME=fitness-room-dev
DYNAMODB_ENDPOINT_URL=http://localhost:8000   # solo local
COGNITO_USER_POOL_ID=us-west-2_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
FRONTEND_URL=http://localhost:5173
SES_SENDER_EMAIL=noreply@fitnessroom.mx
```

### Frontend / Portal (`frontend/.env`, `portal/.env`)
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_COGNITO_USER_POOL_ID=us-west-2_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_REGION=us-west-2
VITE_ENV=development
```

---

## Convenciones de código

### Backend (Python)
- `snake_case` para todo. Type hints obligatorios.
- Docstrings en módulos, clases y funciones públicas.
- `mypy` y `ruff` corren en `make lint`.
- Tests en `backend/tests/` con `pytest`.

### Frontend (TypeScript)
- `PascalCase` para componentes, `camelCase` para todo lo demás.
- Funciones exportadas con tipo de retorno explícito (`: React.JSX.Element`).
- Imports: React → third-party → `@/` interno.
- **No usar `any`** sin comentario explicativo.

### Git
- Rama: `fzacarias/fire-XXXX/descripcion`
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- PR requiere `type-check`, `lint`, `build` y `test` en verde.
- **Nunca pushear sin OK explícito del usuario.**

---

## Versionado (5 lugares en sync)

| # | Archivo | Campo |
|---|---|---|
| 1 | `VERSION` | texto plano |
| 2 | `frontend/package.json` | `"version"` |
| 3 | `frontend/src/lib/changelog.ts` | `APP_VERSION` + nueva entrada al inicio del array |
| 4 | `backend/src/routers/health.py` | `version=` en `HealthResponse` |
| 5 | `CHANGELOG.md` | nueva sección `## [x.y.z]` al inicio |

```bash
./scripts/bump-version.sh 1.9.0
./scripts/check-version.sh
```

---

## Advertencias conocidas

1. **`/api/v1/stats`** hace N queries internas a DynamoDB. Aceptable con < 500 alumnos. Si el dashboard se pone lento → cache nocturno o ElastiCache.
2. **Paginación** — la mayoría de listas cargan `limit=200` y filtran client-side. Implementar server-side cuando se superen 500 entidades.
3. **Reservaciones con status `attended`**: cuentan en `reservations_count` y aparecen en el listado de inscritos (fix v1.8.5). La regla "1 clase/día" para Founder considera también `attended`.
4. **Cognito en local** — `AuthContext` tiene un bypass cuando `VITE_ENV=development`. Jamás en producción.
5. **DynamoDB billing** — `PAY_PER_REQUEST`. Revisar si supera 1M requests/mes.
6. **Portal vs Frontend** — dos apps independientes con sus propios `package.json` y builds. Portal usa Tailwind 3.4, no 4. **No** mezclar componentes ni dependencias.
7. **EventBridge** — handlers de notificaciones SES (alertas de vencimiento) configurados como reglas en `ApiStack`.
8. **El bucket del portal y el del admin son distintos**: si por error desplegas el bundle de admin sobre el del portal (o viceversa), los socios verán la app del admin (que rechaza grupos `student`/`teacher`). Pasó en v1.8.x — fix en v1.8.3.

---

## Cómo agregar un nuevo módulo

1. **Backend:**
   - `backend/src/models/mi_modulo.py` — Pydantic models
   - `backend/src/repositories/mi_modulo_repository.py` — DynamoDB
   - `backend/src/services/mi_modulo_service.py` — lógica
   - `backend/src/routers/mi_modulo.py` — FastAPI router
   - Registrar en `backend/src/main.py`: `app.include_router(mi_modulo.router, prefix="/api/v1")`

2. **Frontend admin:**
   - `frontend/src/types/miModulo.ts`
   - `frontend/src/services/miModuloService.ts`
   - `frontend/src/hooks/useMiModulo.ts`
   - `frontend/src/routes/mi_modulo/index.tsx`
   - Agregar al `Sidebar.tsx`
   - Agregar traducciones a **ambos** `es.json` y `en.json`

3. **Portal (si aplica):**
   - Método en `portal/src/services/api.ts`
   - Página en `portal/src/pages/MiPagina.tsx`
   - Ruta en `App.tsx` y link en `BottomNav.tsx`

---

*Última actualización: 2026-05-19 — v1.8.5 — Para detalle operativo (deploys, AWS account IDs, distribuciones CloudFront), ver [`.claude/CLAUDE.md`](.claude/CLAUDE.md)*
