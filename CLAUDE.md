# CLAUDE.md — Fitness Room System

Guía para IAs y desarrolladores que trabajen en este proyecto.
**Lee esto antes de modificar cualquier cosa.**

---

## Qué es este proyecto

Sistema de gestión integral para **Fitness Room**, un estudio de fitness en México.
Permite gestionar alumnos, membresías, clases, instructores y check-in de acceso.

**Stack:**
- **Frontend** — React 19 + TypeScript + Vite 6 + Tailwind CSS 4 (`/frontend/`)
- **Backend** — Python 3.12 + FastAPI + DynamoDB + AWS Lambda (`/backend/`)
- **Infra** — AWS CDK v2 Python (`/infrastructure/`)
- **Landing** — Next.js 15 + Tailwind CSS 4 (`/landing/`)

---

## Arquitectura de alto nivel

```
Browser → CloudFront → S3 (React SPA)
        → API Gateway v2 → Lambda (FastAPI+Mangum) → DynamoDB
              ↑
         Cognito JWT
```

**Regla de oro:** El backend es serverless puro. Toda la lógica vive en servicios (`/backend/src/services/`). Los routers solo validan y delegan.

---

## Cómo correr en local

### Backend
```bash
cd backend
uv sync
cp .env.example .env   # edita los valores
uv run uvicorn src.main:app --reload --port 8000
# Swagger: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
pnpm install
cp .env.example .env
pnpm dev
# App: http://localhost:5173
```

### Landing
```bash
cd landing
npm install
npm run dev
# Landing: http://localhost:3000
```

---

## Estructura del frontend

```
frontend/src/
  routes/          # Pages — TanStack Router (file-based routing)
    index.tsx      # Dashboard (/)
    checkin.tsx    # Check-in (/checkin)
    login.tsx      # Login (/login)
    students/      # /students
    classes/       # /classes
    memberships/   # /memberships
    reservations/  # /reservations
    instructors/   # /instructors
    settings.tsx   # Settings (/settings)
  components/
    layout/        # Sidebar, AppLayout
    shared/        # Modals, StatusBadge, Dialog, ErrorBoundary
  hooks/           # TanStack Query hooks (useStudents, useClasses, etc.)
  services/        # Axios API calls (studentService, classService, etc.)
  types/           # TypeScript interfaces for all entities
  i18n/            # react-i18next — locales/es.json + locales/en.json
  store/           # Zustand stores (useThemeStore)
  config/          # theme.ts (applyTheme function)
  lib/             # utils.ts (cn, formatDate, formatCurrency, getInitials)
  index.css        # CSS design tokens (CSS variables)
```

---

## Sistema de diseño — MUY IMPORTANTE

### Paleta: Negro/Dorado + Dark/Light mode

El `data-theme="dark"` o `data-theme="light"` se setea en `<html>`.

**Variables CSS (definidas en `index.css`):**

| Variable | Uso |
|---|---|
| `--bg-base` | Fondo principal de página |
| `--bg-surface` | Tarjetas y paneles |
| `--bg-elevated` | Modals y dropdowns |
| `--bg-muted` | Inputs, superficies sutiles |
| `--bd-default` | Bordes normales |
| `--bd-subtle` | Bordes muy sutiles |
| `--tx-primary` | Texto principal |
| `--tx-muted` | Texto secundario |
| `--tx-disabled` | Texto placeholder/deshabilitado |
| `--gold` | Dorado de marca |
| `--gold-hover` | Dorado hover |
| `--gold-bg` | Fondo dorado transparente |
| `--gold-bd` | Borde dorado transparente |
| `--gold-fg` | Texto sobre fondo dorado (negro/blanco) |
| `--color-success/warning/danger/info` | Colores de estado |
| `--color-*-bg / --color-*-bd` | Fondos/bordes de estado |

**Uso en Tailwind 4:**
```tsx
className="bg-[--bg-surface] text-[--tx-primary] border-[--bd-default]"
```

**Botón primario (siempre inline style para el color):**
```tsx
<button
  style={{ background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-hover) 100%)", color: "var(--gold-fg)" }}
>
```

**NUNCA usar:**
- `bg-slate-*`, `text-white`, `bg-emerald-*`, `text-green-*` — usar variables CSS
- Colores hardcodeados como `#1a1a1a` en componentes JSX

---

## Patrones de backend

### Estructura por módulo

```
routers/students.py    → validación + HTTP → delega a service
services/student_service.py → lógica de negocio → llama a repository
repositories/student_repository.py → DynamoDB access
models/student.py      → Pydantic v2 models (Request, Response, DynamoDB)
```

### DynamoDB single-table

| Entidad | PK | SK |
|---|---|---|
| Student | `STUDENT#{id}` | `PROFILE` |
| Membership | `STUDENT#{id}` | `MEMBERSHIP#{id}` |
| Reservation | `STUDENT#{id}` | `RESERVATION#{id}` |
| Class | `CLASS#{id}` | `METADATA` |
| Instructor | `INSTRUCTOR#{id}` | `PROFILE` |
| Checkin | `STUDENT#{id}` | `CHECKIN#{datetime}` |

**GSIs disponibles:**
- `GSI1`: EntityType + SK (lista de entidades por tipo)
- `GSI2`: InstructorId + ClassDate (clases por instructor)
- `GSI3`: ClassDate + StartTime (clases por fecha)

### Patrón de repositorio

```python
# Siempre usar self._table de DynamoDB resource
# PutItem, GetItem, Query, UpdateItem
# Raise ResourceNotFoundException para 404s
# Raise ResourceAlreadyExistsException para 409s
```

### Auth

Todos los endpoints protegidos necesitan `_current_user: dict = Depends(get_current_user)`.
El endpoint `/health` es público.

---

## Patrones de frontend

### TanStack Query hooks

```tsx
// hooks/useStudents.ts — patrón estándar
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

### Servicios API

```tsx
// services/studentService.ts — patrón estándar
export const studentService = {
  list: (params?) => apiClient.get<PaginatedResponse<Student>>("/students", { params }),
  getById: (id) => apiClient.get<Student>(`/students/${id}`),
  create: (data) => apiClient.post<Student>("/students", data),
  update: (id, data) => apiClient.patch<Student>(`/students/${id}`, data),
};
```

### Modals

Todos los modals usan el componente `<Dialog>` base en `components/shared/Dialog.tsx`.
Los inputs siempre usan la clase local `inputCls`:
```tsx
const inputCls = "w-full rounded-xl border border-[--bd-default] bg-[--bg-muted] px-4 py-3 text-sm text-[--tx-primary] placeholder-[--tx-disabled] focus:border-[--gold] focus:outline-none focus:ring-2 focus:ring-[--gold-bd]";
```

---

## i18n

- Idiomas: Español (default) e Inglés
- Archivos: `frontend/src/i18n/locales/es.json` y `en.json`
- Uso: `const { t } = useTranslation()` → `t("settings.title")`
- Detección: localStorage → navigator, fallback a `"es"`
- **Regla:** Toda string visible al usuario debe tener key en ambos archivos

---

## Flujos críticos (contexto México)

### Check-in (operación más frecuente — varias veces/día)

1. Recepcionista abre `/checkin`
2. Teclea 2+ letras del nombre
3. Dropdown con hasta 10 resultados
4. Click en miembro → panel derecho muestra estado inmediatamente
5. Verde ✅ = acceso, ámbar ⚠️ = acceso pero por vencer, rojo ❌ = denegado
6. Click "Registrar Check-in" → POST /students/{id}/checkin

**Reglas de acceso:**
- status `active` o `founder` ✓
- Membresía activa existente ✓
- `days_until_expiry > 0` ✓

### Membresías en México

| Tipo | Duración | Clases |
|---|---|---|
| monthly | 1 mes | sin límite |
| quarterly | 3 meses | sin límite |
| semi_annual | 6 meses | sin límite |
| annual | 12 meses | sin límite |
| class_pack_5 | sin fecha | 5 clases |
| class_pack_10 | sin fecha | 10 clases |
| class_pack_20 | sin fecha | 20 clases |
| day_pass | 1 día | sin límite |

Los packs de clases decrementan `classes_remaining` en cada asistencia.

### Alertas de vencimiento

- El sistema alerta membresías que vencen en **7 días** (crítico) y **30 días** (aviso)
- El dashboard muestra el conteo en tiempo real
- `GET /api/v1/memberships/expiring?days=7` y `?days=30`

---

## Endpoints API

```
GET  /health                              Ping (público)

GET  /api/v1/stats                        Dashboard stats (una llamada = todo)

GET  /api/v1/students                     Lista alumnos
POST /api/v1/students                     Crear alumno
GET  /api/v1/students/{id}               Detalle
PATCH /api/v1/students/{id}              Actualizar
DELETE /api/v1/students/{id}             Eliminar
POST /api/v1/students/{id}/activate      Activar
POST /api/v1/students/{id}/deactivate    Desactivar
POST /api/v1/students/{id}/checkin       Registrar check-in

GET  /api/v1/memberships                 Lista membresías
POST /api/v1/memberships                 Asignar membresía
GET  /api/v1/memberships/expiring        Membresías por vencer
GET  /api/v1/memberships/{id}           Detalle
GET  /api/v1/memberships/student/{id}   Membresías de alumno
GET  /api/v1/memberships/student/{id}/active  Membresía activa
POST /api/v1/memberships/{id}/renew      Renovar

GET  /api/v1/classes                     Lista clases
POST /api/v1/classes                     Crear clase
GET  /api/v1/classes/{id}               Detalle
PATCH /api/v1/classes/{id}              Actualizar
POST /api/v1/classes/{id}/cancel        Cancelar clase

GET  /api/v1/reservations               Lista reservaciones
POST /api/v1/reservations               Crear reservación
GET  /api/v1/reservations/{id}         Detalle
DELETE /api/v1/reservations/{id}       Cancelar
POST /api/v1/reservations/{id}/attend   Marcar asistencia

GET  /api/v1/instructors                Lista instructores
POST /api/v1/instructors               Crear instructor
PATCH /api/v1/instructors/{id}         Actualizar
POST /api/v1/instructors/{id}/activate  Activar
POST /api/v1/instructors/{id}/deactivate Desactivar
```

---

## Fases del proyecto

| Fase | Módulos | Estado |
|---|---|---|
| **Fase 1** | Alumnos, Membresías, Clases, Reservas, Instructores, Check-in | ✅ Completado |
| **Fase 2** | Notificaciones WhatsApp/Email, Reportes financieros | 🔜 Planeado |
| **Fase 3** | Corte de caja, Inventario de equipo | 🔜 Planeado |
| **Fase 4** | Rankings, Métricas de fidelización, Motivación | 🔜 Planeado |

**Fase 2 — WhatsApp** es crítica para México. API de WhatsApp Business para recordatorios de renovación.

---

## Variables de entorno

### Backend (`backend/.env`)

```bash
ENVIRONMENT=local
DYNAMODB_TABLE_NAME=fitness-room-dev
DYNAMODB_ENDPOINT_URL=http://localhost:8000   # solo local
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

## Infraestructura AWS

Cuatro stacks CDK en orden de despliegue:

1. **DatabaseStack** — DynamoDB tabla única con GSIs
2. **AuthStack** — Cognito User Pool + App Client (depende de DatabaseStack)
3. **ApiStack** — Lambda + API Gateway v2 HTTP API (depende de AuthStack)
4. **HostingStack** — S3 + CloudFront (independiente)

```bash
cd infrastructure/cdk
cdk deploy DatabaseStack --profile salle-cajas
cdk deploy AuthStack --profile salle-cajas
cdk deploy ApiStack --profile salle-cajas
cdk deploy HostingStack --profile salle-cajas
```

---

## Convenciones de código

### Backend (Python)
- `snake_case` para todo
- Docstrings en todos los módulos, clases y funciones
- `mypy` para type checking
- `ruff` para linting
- Tests en `backend/tests/` con `pytest`

### Frontend (TypeScript)
- `PascalCase` para componentes, `camelCase` para todo lo demás
- Funciones con tipo de retorno explícito (`:React.JSX.Element`)
- Imports: React built-ins → third-party → `@/` alias interno
- No usar `any` sin comentario explicativo

### Git
- Rama: `fzacarias/fire-XXXX/descripcion`
- Commits Conventional: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- PR requiere pasar `type-check`, `lint`, `build` y `test`

---

## Advertencias conocidas

1. **`useStats.ts`** — El endpoint `/api/v1/stats` hace N queries a DynamoDB internamente. En Phase 1 es aceptable. En Phase 2 considerar ElastiCache.

2. **Paginación** — La mayoría de listas cargan `limit=200` en el cliente para filtrado local. Cuando el número de alumnos supere 500, implementar paginación server-side real.

3. **Check-in** — No hay deduplicación de check-ins en el mismo día. En Phase 2, verificar si ya hizo check-in hoy antes de registrar.

4. **Cognito en local** — El `AuthContext` tiene un bypass para `VITE_ENV=development` que evita login real. **JAMÁS** en producción.

5. **DynamoDB costos** — La tabla usa `PAY_PER_REQUEST`. Con bajo volumen es más barato. Revisar si supera 1M requests/mes para considerar `PROVISIONED`.

---

## Cómo agregar un nuevo módulo

1. **Backend:**
   - `backend/src/models/mi_modulo.py` — Pydantic models
   - `backend/src/repositories/mi_modulo_repository.py` — DynamoDB
   - `backend/src/services/mi_modulo_service.py` — Lógica
   - `backend/src/routers/mi_modulo.py` — FastAPI router
   - Registrar en `backend/src/main.py`: `app.include_router(mi_modulo.router, prefix="/api/v1")`

2. **Frontend:**
   - `frontend/src/types/mi_modulo.ts` — TypeScript types
   - `frontend/src/services/miModuloService.ts` — API calls
   - `frontend/src/hooks/useMiModulo.ts` — TanStack Query hooks
   - `frontend/src/routes/mi_modulo/index.tsx` — Page
   - Agregar al Sidebar en `frontend/src/components/layout/Sidebar.tsx`
   - Agregar traducciones a `es.json` y `en.json`

---

*Actualizado: 2026-04-08 | Fase 1 completada*
