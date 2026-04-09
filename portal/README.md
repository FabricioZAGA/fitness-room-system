# Fitness Room - Portal del Alumno

Portal read-only para alumnos de Fitness Room System.

## Características

- **Login con Cognito**: Autenticación segura usando AWS Cognito
- **Perfil**: Ver información personal (read-only)
- **Membresía**: Ver membresía vigente y fecha de vencimiento
- **QR Code**: Generar y mostrar código QR para check-in
- **Reservaciones**: Ver y cancelar clases reservadas
- **Check-ins**: Ver historial de asistencia

## Instalación

```bash
cd portal
npm install
```

## Configuración

Copiar `.env.example` a `.env` y configurar las variables:

```bash
cp .env.example .env
```

Variables requeridas:
- `VITE_API_URL`: URL del backend API (default: `http://localhost:8000`)
- `VITE_COGNITO_USER_POOL_ID`: ID del User Pool de Cognito
- `VITE_COGNITO_CLIENT_ID`: ID del App Client de Cognito
- `VITE_COGNITO_REGION`: Región de Cognito (default: `us-east-1`)

## Desarrollo

```bash
npm run dev
```

El portal estará disponible en `http://localhost:3001`

## Build

```bash
npm run build
```

## Linting

```bash
npm run lint
npm run lint:fix
npm run format
```

## Arquitectura

```
src/
├── pages/          # Páginas de la aplicación
│   ├── Login.tsx   # Login con Cognito
│   ├── Dashboard.tsx # Dashboard principal
│   ├── Profile.tsx  # Perfil del alumno
│   ├── QR.tsx       # Código QR
│   └── Schedule.tsx # Reservaciones
├── services/       # Servicios de API
│   └── api.ts      # Cliente Axios
├── App.tsx         # Componente principal
└── main.tsx        # Punto de entrada
```

## Endpoints del Backend

El portal usa los siguientes endpoints del backend (todos requieren autenticación y grupo 'student'):

- `GET /api/v1/portal/profile` - Obtener perfil del alumno
- `GET /api/v1/portal/membership` - Obtener membresía vigente
- `GET /api/v1/portal/reservations` - Obtener reservaciones
- `DELETE /api/v1/portal/reservations/{id}` - Cancelar reservación
- `GET /api/v1/portal/checkins` - Obtener historial de check-ins
- `GET /api/v1/portal/qr` - Obtener código QR

## Seguridad

- Todos los endpoints requieren token JWT de Cognito
- El usuario debe pertenecer al grupo `student` de Cognito
- Solo permite operaciones read-only (no puede modificar datos)
- Los alumnos solo pueden ver sus propios datos (se valida por `student_id` en el token)
