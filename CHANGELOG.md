# Changelog

Todos los cambios notables de este proyecto están documentados aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [1.5.2] — 2026-04-23

### Fixed
- Audit completo de traducciones ES/EN en el admin
- Agregada key `nav.users` faltante en `es.json` ("Usuarios") y `en.json` ("Users")
- Eliminado fallback hardcodeado `"Usuarios"` en `Sidebar.tsx` — ahora usa el archivo de locale
- Portal validado: todos los strings están en español (idioma único del portal, sin switch de idioma)

---

## [1.5.1] — 2026-04-23

### Fixed
- Estado de usuarios en la página de gestión ahora muestra badges visuales en lugar de texto plano
- `CONFIRMED` → badge verde "Confirmado"
- `FORCE_CHANGE_PASSWORD` → badge amarillo "Cambio de contraseña pendiente"
- `UNCONFIRMED` → badge azul "Sin confirmar"
- `RESET_REQUIRED` → badge amarillo "Requiere reseteo"
- `EXTERNAL_PROVIDER` → badge azul "Proveedor externo"
- Cualquier estado desconocido muestra el valor raw de Cognito como fallback

---

## [1.5.0] — 2026-04-23

### Added
- Cursor pointer global en todos los elementos interactivos (botones, links, selects) — frontend y portal
- Pantalla de Configuración 100% funcional:
  - Apariencia (tema claro/oscuro) con persistencia automática en localStorage
  - Idioma (ES/EN) con bandera y persistencia automática en localStorage
  - Información del Studio con guardado local
  - Umbrales de notificaciones configurables y persistentes
  - Envío manual de recordatorios de vencimiento y alertas de inactividad
  - Log de últimas notificaciones enviadas con estado (enviado/fallido) y skeleton loader
  - Cambio de contraseña vía Cognito
- Info del sistema con datos reales: versión dinámica, entorno detectado automáticamente, fase actual
- Historial de versiones expandible en la sección de info del sistema
- Optimización de costos AWS: eliminación de WAF huérfano de `salle-cajas-app` (~$5/mes), eliminación de app Amplify `landing` vacía (~$0.50/mes)
- Ícono Send en botones de envío de notificaciones

### Fixed
- Detección de idioma activo corregida para manejar locales con región (ej. `es-MX` → `es`)
- Environment label dinámico basado en `VITE_ENV` / `MODE`
- Sección de notificaciones muestra estado vacío descriptivo en lugar de no renderizar nada

### Changed
- Versión frontend bumpeada a 1.5.0
- Versión portal bumpeada a 1.2.0
- Ícono de idioma cambiado a `Globe` (más semántico que `Info`)
- Fase del sistema actualizada a "Fase 2.5 — Portal & QR" (refleja estado real)

---

## [1.4.0] — 2026-04

### Added
- Rediseño completo de la UI de miembros y membresías
- Modelo de estados de membresía con lógica en cascada (active → expired → cancelled)
- Campo de teléfono con formato E.164 y validación
- Dirección estructurada (calle, colonia, ciudad, estado, CP)
- Módulo de gestión de usuarios con RBAC (admin/staff/student)
- Componentes compartidos: `PhoneInput`, `AddressInput`
- Hook `useUsers` para gestión de usuarios Cognito desde el admin

### Fixed
- Todos los modals son scrollables cuando el contenido excede el viewport
- Threads del backend se unen antes de retornar para evitar que Lambda congele daemons
- CORS corregido — `adminSubdomain` era `'app'` en lugar de `'admin'`
- Tasks post-creación ejecutadas en background thread para evitar timeout de CORS

---

## [1.3.0] — 2026-03

### Added
- Fotos de perfil para alumnos (upload a S3)
- Modo de clase: presencial / virtual / híbrido
- Sistema de control de acceso por roles (admin / staff)
- Página de gestión de usuarios en el admin
- Changelog inicial del proyecto

### Fixed
- Sender de email de script admin actualizado a `noreply@fitnessroom.mx`

---

## [1.2.0] — 2026-02 (Fase 2.5)

### Added
- **Portal de alumnos e instructores** — app React independiente en `/portal/`
- Código QR personal para check-in rápido
- Congelamiento y descongelamiento de membresías
- Exportación de reportes a PDF (ReportLab) y Excel (openpyxl)
- Carta responsiva generada automáticamente en PDF
- Auto-creación de usuario Cognito al registrar alumno para acceso al portal
- Endpoints del portal: perfil, membresía activa, QR, clases, reservaciones, historial de check-ins

---

## [1.1.0] — 2026-01 (Fase 2)

### Added
- **Notificaciones por email** vía AWS SES — recordatorios de vencimiento e inactividad
- **Módulo de Reportes**: ingresos por rango de fechas, asistencia, rankings de alumnos, alumnos inactivos
- **Módulo de Caja**: registro de transacciones, corte de caja, historial
- **Módulo de Inventario**: productos, ventas, alertas de stock bajo
- EventBridge rule para envío automático diario de notificaciones (09:00 AM CDMX)
- Templates de email HTML para todos los tipos de notificación
- Endpoints: `/api/v1/transactions`, `/api/v1/inventory`, `/api/v1/reports`, `/api/v1/notifications`

### Changed
- Backend API bumpeado a v1.1.0
- Lambda timeout aumentado a 60s para operaciones de reportes

---

## [1.0.0] — 2025-12 (Fase 1)

### Added
- **Lanzamiento inicial** del sistema de gestión Fitness Room
- Módulo de Alumnos: CRUD completo, activar/desactivar, foto de perfil
- Módulo de Membresías: 8 tipos (monthly, quarterly, semi_annual, annual, class_pack_5/10/20, day_pass)
- Módulo de Clases: programación, capacidad, waitlist automático
- Módulo de Reservaciones: reservar, cancelar, marcar asistencia
- Módulo de Instructores: CRUD con especialidades
- **Check-in**: búsqueda por nombre en tiempo real, validación de membresía, registro de entrada
- Dashboard con estadísticas: miembros activos, clases del día, membresías por vencer, ingresos del día
- Sistema de diseño Negro/Dorado con dark/light mode via CSS variables
- i18n Español/Inglés con react-i18next
- Autenticación con AWS Cognito (JWT), 3 grupos: admin, staff, student
- Infraestructura AWS: DynamoDB single-table, Lambda + API Gateway v2, S3 + CloudFront, Cognito
- CDK v2 con 5 stacks: Database, Auth, Api, Hosting, PortalHosting
- CI/CD: CodePipeline v2 + CodeBuild con deploy por tags git

---

*Generado el 2026-04-23 | Fitness Room — Sistema de Gestión*
