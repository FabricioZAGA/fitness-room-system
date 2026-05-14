# Changelog

Todos los cambios notables de este proyecto están documentados aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [1.8.2] — 2026-05-14

### Added
- Pantalla de Membresías rediseñada: pestañas Activas / Por vencer / Vencidas / Congeladas / Canceladas / Todas
- KPI "Ingreso del mes" calculado a partir de membresías iniciadas en el mes en curso
- Búsqueda por nombre de alumno y filtro por estado en Membresías
- Cada tarjeta muestra foto del alumno, plan, fechas (inicio + vencimiento), precio pagado, sesiones restantes y badge de estado
- Endpoint backend `GET /api/v1/memberships` con filtro por status (`active | frozen | expired | cancelled`)
- Service auto-clasifica como `expired` cualquier membresía con `end_date < hoy` aunque su status almacenado siga `active`

### Fixed
- Calendario de Clases: la query de rango por fecha en GSI1 dejaba fuera clases del último día (ahora usa `BETWEEN DATE#{start}` y `DATE#{end}~`)
- Configuración → Información del Sistema: versión y "Última actualización" desfasadas (mostraban v1.5.0 hardcodeado); ahora se leen de `lib/changelog.ts`, misma fuente que el popup "Novedades"
- Notas de versión históricas en Configuración ahora muestran título e iconos consistentes con el popup

### Changed
- Frontend `useReservations` invalida también el query key `classes` en `onSuccess` para sincronizar contadores tras reservar/cancelar

---

## [1.8.1] — 2026-05-13

### Fixed
- Foto del instructor ahora se muestra en la lista de instructores (antes solo mostraba iniciales)
- Foto del alumno ahora aparece en la lista de reservaciones por clase
- Foto del alumno visible en la vista de membresías por vencer
- Avatar en modal de edición de alumno muestra iniciales doradas cuando no hay foto (antes mostraba un ícono genérico)
- Portal: Dashboard y pantalla de Perfil ahora muestran la foto del usuario; fallback a iniciales

### Changed
- Recepcionista ahora tiene acceso a las pestañas de **Clases**, **Reservaciones** y **Usuarios** (lectura)
- Backend: endpoints `GET /users` y `GET /users/{username}` ahora permiten `receptionist` (antes solo `admin`)

---

## [1.8.0] — 2026-05-13

### Added
- Calendario con 4 vistas: **Mes**, **Semana**, **3 Días** y **Hoy** — navegación con flechas y cambio de vista instantáneo
- Restricción de 1 clase por día para membresías Fundador, Room Daily y Room Pass
- Ventana mínima de reservación: 5 minutos antes del inicio de la clase
- Ventana mínima de cancelación: 15 minutos antes del inicio de la clase
- Walk-in: recepción puede registrar alumnos aunque la clase ya haya iniciado (`staff_override`)
- Foto del alumno visible en el kiosco de check-in (cuando tiene foto cargada)
- Exportar reporte de **asistencia** a Excel y PDF
- Exportar reporte de **usuarios** (Cognito) a Excel y PDF
- Calendario filtra clases por rango de fecha visible (optimización de API)

### Changed
- Alertas de inactividad ahora envían un solo correo resumen al administrador (umbral: 30 días)
- Cancelación en portal: ventana reducida de 2 horas a 15 minutos

---

## [1.7.3] — 2026-05-08

### Added
- `POST /students/{id}/resend-welcome` — reenvía email de bienvenida + carta responsiva PDF
- `POST /students/{id}/resend-credentials` — resetea contraseña Cognito y reenvía credenciales del portal, con opción `skip_password_change` para contraseña permanente
- `POST /students/{id}/update-contact` — actualiza email/teléfono en DynamoDB + sincroniza Cognito + reenvía credenciales al nuevo correo
- `CognitoService.update_user_email` — actualiza email en Cognito con `email_verified=true`
- `CognitoService.set_permanent_password` — genera contraseña permanente (sin cambio forzado al primer login)
- Sección "Notificaciones" en detalle de alumno con botones de reenvío
- Modal "Actualizar Datos de Contacto" con cambio de email/teléfono + sync Cognito
- Checkbox "Contraseña permanente" en reenvío de credenciales e invitaciones de usuarios
- `ConfirmDialog` ahora acepta `children` para contenido adicional
- i18n: claves `students.resendWelcome`, `students.resendCredentials`, `students.updateContact`, etc. en ES y EN

### Changed
- `POST /users/{username}/resend-invite` ahora acepta `?skip_password_change=true` para contraseña permanente

---

## [1.7.2] — 2026-05-01

### Changed
- `carta_responsiva.py` — refinados los textos del bloque legal: "Correo registrado" sustituye a "Correo verificado" (no hacemos verificación real de email), "Firmante (alumno)" y "Emisor (contraparte)" son más explícitos, y el footer centrado ahora muestra "Emitido por {gym_name} · {gym_email}" en vez del correo del alumno
- `generate_carta_responsiva` acepta un nuevo parámetro `gym_email` (default `contacto@fitnessroom.mx`) que se incorpora al bloque "Emisor" y al footer
- `EventNotifier.notify_portal_credentials` acepta parámetro `audience` (`admin` / `staff` / `student`) — ajusta el subject a "Panel de Administración" o "Panel del Staff" cuando corresponde, en lugar de decir "Portal de Alumnos" para todos
- `POST /api/v1/users` pasa `audience=data.group` para que los correos de invitación a admins/staff tengan el título correcto

---

## [1.7.1] — 2026-05-01

### Fixed
- **Registrar productos ahora funciona.** `inventory_service.create_product` usaba `extra={"name": data.name}` en `logger.info`, y `name` es una clave reservada de Python `LogRecord` — eso lanzaba `KeyError` y el endpoint devolvía 500 silencioso. Renombrado a `product_name`. Este bug causó la queja del dueño "no me deja registrar productos" — en CloudWatch no hay ni un log porque el crash ocurría antes de que Powertools alcanzara a registrar la petición
- `InventoryRepository.update_product` guardaba `price` como `str(value)` en DynamoDB, corrompiendo el tipo del atributo; ahora se pasa el float tal cual y el repo base se encarga de la conversión a `Decimal`
- `DynamoRepository.update_item` ahora aplica `_floats_to_decimal` a todos los valores antes de mandarlos a DynamoDB (antes solo lo hacía `put_item`, lo cual causaba errores silenciosos en cualquier actualización con números)

### Added
- `POST /api/v1/inventory/products/low-stock/notify` — endpoint manual para disparar correos de stock bajo a los admins; útil como botón "Enviar alertas" en el banner de inventario
- `useNotifyLowStock` hook en el frontend + botón "Enviar alertas" junto al banner amarillo cuando hay productos bajos
- Validación visible en el modal de "Nuevo Producto" — lista los errores debajo del form, acepta Enter para enviar, `autoFocus` en el nombre
- Logging más rico en `create_product` (categoría, precio, stock, product_id de salida)

---

## [1.7.0] — 2026-04-29

### Added
- `scripts/migrate_types.py` — idempotent DynamoDB migration para renombrar tipos viejos (`monthly`→`room_daily`, `class_pack_*`→`room_flex`, `pilates`→`mat`, etc.) con dry-run por defecto
- `MEMBERSHIP_DEFAULT_PRICE` en `frontend/src/types/membership.ts` — el modal de Nueva Membresía precarga el precio sugerido al cambiar de plan
- `scripts/migrate_types.py`, dashboard error boundary con botón Reintentar, y toast de error en creación/actualización/reabastecimiento de productos

### Changed
- `MembershipType` enum (backend + frontend + portal): `founder`, `room_daily`, `room_elite`, `room_flex`, `room_pass` — reemplaza el catálogo legacy de `monthly/quarterly/semi_annual/annual/founder_monthly/class_pack_5-10-20/day_pass`
- `ClassType` enum: `hyrox`, `strong_nation`, `entrenamiento_funcional`, `yoga`, `mat`, `zumba` — reemplaza `strong/hiit/pilates/cycling`
- `CreateMembershipModal` usa `endDateFor(type, start)` centralizado y precarga precio por plan; Room Flex muestra campo "Total de sesiones" (default 12)
- `membership_service.assign_membership` — detección de session-pack vía `ROOM_FLEX` en lugar de class_pack_5/10/20
- Caja (`frontend/src/routes/caja/index.tsx`) — el modal de "Registrar Pago" ya no expone los tipos `membership`/`class_pack`, solo `product` y `other`. Las membresías se cobran desde "Nueva Membresía" (que sigue auto-creando la transacción)
- `stats` endpoint envuelve cada fuente de datos en try/except y skippea filas corruptas individualmente con logs explícitos
- `gym-landing/lib/config.ts` + `app/page.tsx` — copy completo actualizado a Fitness Room León: nuevo tagline, 5 planes reales (con tag AGOTADO para Socio Fundador), 6 clases sin horarios, removida la sección de Coaches, horarios matutino/vespertino, dirección real, teléfonos reales, Instagram y Facebook (sin TikTok), "Desde 2002"
- `MEMBERSHIP_TYPE_LABELS` en `event_notifier` y `notification_service` conservan etiquetas legacy para correos históricos mientras la migración completa el reemplazo

### Fixed
- Dashboard ya no se queda en blanco si una fuente falla — muestra UI de error con botón Reintentar y el backend degrada el payload en lugar de 500ear
- Crear/actualizar/reabastecer productos ahora muestra toast con el detalle del error en lugar de fallar silenciosamente
- Portal `Schedule.tsx` mock y label map alineados con backend (antes usaban tipos inventados como `spinning/cross_training`)

---

## [1.6.0] — 2026-04-28

### Added
- `useSessionExpiry` hook en admin y portal — decodifica el `exp` del idToken, poll cada 15s (y en `visibilitychange`), expone `status: "idle" | "warning" | "expired"` y `secondsLeft`
- `SessionExpiryModal` en ambas apps — modal con countdown `M:SS`, botones **Continuar sesión** y **Cerrar sesión**
- Checkbox "Mantener sesión iniciada en este navegador" en el login de admin y portal — guarda la preferencia en `localStorage`
- Checkbox "No volver a preguntar en este navegador" dentro del modal — activa renovación silenciosa sin modal
- Sección "Olvidar este navegador" en Configuración → Seguridad del admin para revertir la preferencia
- Toast "Tu sesión expiró" (sonner) cuando el refresh falla o el usuario no responde al modal
- Claves i18n `session.*` y `login.keepSession*` en `es.json` y `en.json`

### Changed
- `__root.tsx` ahora inyecta el `SessionExpiryModal` para rutas autenticadas y maneja logout-on-expired con redirección a `/login`
- Portal `App.tsx` envuelve el `BrowserRouter` con un `SessionMonitor` que usa `react-router-dom` para navegar en expiración

---

## [1.5.6] — 2026-04-24

### Added
- Pre-send SES suppression-list check en `EventNotifier._check_not_suppressed` — destinatarios suprimidos ahora lanzan `SuppressedRecipientError` en vez de descartarse silenciosamente
- `POST /api/v1/users/{username}/resend-invite` — regenera la contraseña temporal y reenvía el correo de credenciales sin recrear al usuario
- Campos `email_delivery_status` / `email_delivery_detail` en `CognitoUserResponse` — la UI distingue entregado vs suprimido vs fallido
- Botón "Reenviar invitación" en la página admin `/users` con diálogo de confirmación
- Rate limiting en el stage `$default` de API Gateway (20 rps sostenido, 50 rps burst) vía `CfnApiGatewayManagedOverrides`
- IAM: el rol de ejecución Lambda ahora tiene `ses:{Get,List,Put,Delete}SuppressedDestination` para consultar/gestionar la lista de supresión

### Changed
- Bundle principal del admin reducido 69% (1,661 kB → 521 kB; gzip 506 kB → 158 kB) con `autoCodeSplitting: true` en TanStack Router + imports dinámicos de `exportReports` (xlsx/jspdf/html2canvas) y `jsqr` del kiosco
- `notify_portal_credentials` ahora devuelve un dict con el estado de entrega para que el caller lo exponga en la UI
- Deps portal: `axios` → 1.15.2, `postcss` → 8.5.10 (parchea CVE GHSA-qx2v-qp2m-jg93)
- Deps admin: `postcss` forzado a ≥8.5.10 vía `pnpm.overrides`

### Fixed
- Los fallos silenciosos de entrega de SES ahora se loggean en DynamoDB con estado `FAILED` y se muestran al admin como toast, en vez de aparentar envío exitoso

---

## [1.5.5] — 2026-04-24

### Fixed
- Colores de estado en inputs (error/éxito) ahora usan CSS variables del design system en lugar de clases hardcodeadas de Tailwind (`red-500`, `emerald-400`)
- Modal "Crear Usuario" — campo de nombre dividido en Nombre y Apellido, consistente con todas las demás entidades del sistema
- Backend `/api/v1/users` — `CreateUserRequest` ahora acepta `first_name` + `last_name` en lugar de `name` completo
- Portal login — bordes de inputs con mayor contraste (`rgba(255,255,255,0.25)`) y texto de requisitos de contraseña más legible (`rgba(255,255,255,0.8)`)
- Portal login — atributos `required` agregados a inputs de email y contraseña

---

## [1.5.4] — 2026-04-24

### Fixed
- Filtros de alumnos por estado (activo, inactivo, suspendido) no mostraban resultados — dato corrupto `status: "new"` en DynamoDB corregido a `active`; backend ahora tolera valores desconocidos con fallback a `active`
- RBAC: `receptionist` agregado a `VALID_GROUPS` en el backend (crear recepcionista daba error 400)
- Gestión de usuarios: modal de creación solo muestra `admin` y `recepcionista` — alumnos e instructores se crean automáticamente desde sus propias páginas
- Primer login: eliminados campos de nombre/apellido en el paso de cambio de contraseña — ya están guardados en Cognito desde el registro

---

## [1.5.3] — 2026-04-23

### Added
- Internacionalización (i18n) completa en el admin frontend: todas las páginas y modales ahora usan `useTranslation()` en lugar de strings hardcodeados en español
- Nuevas secciones de traducción en `es.json` / `en.json`: `caja`, `reportes`, `inventario`, plus keys adicionales en `students`, `instructors`, `users`, `common`
- Páginas wired: `users/`, `caja/`, `reportes/`, `inventario/`
- Modales wired: `CreateStudentModal`, `EditStudentModal`, `CreateInstructorModal`, `EditInstructorModal`

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
