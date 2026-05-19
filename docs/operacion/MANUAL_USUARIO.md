# Manual de Usuario — Fitness Room System

**Sistema de gestión integral para Fitness Room**
Versión 2.5 · Fases 1–2.5 completadas · Actualizado: 2026-04-20

---

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Dashboard (Inicio)](#2-dashboard-inicio)
3. [Check-in](#3-check-in)
4. [Alumnos](#4-alumnos)
5. [Clases](#5-clases)
6. [Reservaciones](#6-reservaciones)
7. [Membresías](#7-membresias)
8. [Caja](#8-caja)
9. [Inventario](#9-inventario)
10. [Reportes](#10-reportes)
11. [Instructores](#11-instructores)
12. [Portal del Alumno](#12-portal-del-alumno)
13. [Configuración](#13-configuracion)
14. [Flujos completos de ejemplo](#14-flujos-completos)
15. [Preguntas frecuentes](#15-preguntas-frecuentes)

---

## 1. Acceso al sistema

Hay **dos aplicaciones** separadas:

| Aplicación | Para quién | Qué hace |
|---|---|---|
| **Panel de administración** | Dueño, recepcionista | Gestionar todo el gimnasio |
| **Portal del alumno** | Alumnos, instructores | Ver su perfil, QR, clases y reservaciones |

### Panel de administración — Login

Al abrir la aplicación aparece la pantalla de inicio de sesión.

**Campos:**
- **Email** — correo registrado en el sistema
- **Contraseña** — contraseña asignada por el administrador

Clic en **"Iniciar sesión"** → valida credenciales y abre el dashboard.

> Si olvidaste tu contraseña, contacta al administrador del sistema para que la restablezca desde AWS Cognito.

---

## 2. Dashboard (Inicio)

**Ruta:** `/`

Resumen completo de la operación del día en una sola pantalla.

### Acciones rápidas (fila superior)

| Botón | Descripción |
|---|---|
| **Check-in** | Ir directamente a registrar entradas |
| **Nuevo Miembro** | Registrar un alumno nuevo |
| **Nueva Clase** | Programar una clase |
| **Membresía** | Asignar plan a un alumno |

### Alerta de membresías por vencer

Si hay membresías que vencen en los próximos **7 días**, aparece un banner amarillo en la parte superior. Haz clic en él para ir directo a la sección de Membresías.

### Tarjetas de estadísticas

| Tarjeta | Qué muestra |
|---|---|
| **Miembros Activos** | Total de alumnos con membresía activa |
| **Clases Hoy** | Clases programadas para hoy |
| **Instructores** | Instructores activos |
| **Por Vencer** | Membresías que vencen en menos de 7 días |

### Panel — Próximas Clases

Lista las clases de hoy con hora, instructor y cuántos alumnos hay reservados vs. la capacidad total.

### Panel — Membresías por Vencer

Lista hasta 5 membresías próximas a expirar. El link "Ver →" en cada nombre abre el perfil del alumno directamente.

### Widget Rankings

Los 5 alumnos con más check-ins en los últimos 30 días. El primero tiene fondo dorado.

### Widget Ingresos de Hoy

Total recaudado hoy dividido en Efectivo / Tarjeta / Transferencia. El link "Ver caja →" lleva a la sección de Caja.

---

## 3. Check-in

**Ruta:** `/checkin`

Esta es la pantalla que más vas a usar durante el día. Está diseñada para ser rápida.

### Cómo registrar un check-in (búsqueda manual)

1. Escribe **2 o más letras** del nombre del alumno en el campo de búsqueda
2. Aparece una lista desplegable con hasta 10 coincidencias
3. **Haz clic en el alumno** → el panel derecho muestra su estado de inmediato

### Check-in con código QR

Si el alumno tiene su QR disponible (desde el portal o impreso):

1. Haz clic en el ícono de cámara en la pantalla de check-in
2. Apunta la cámara al QR del alumno
3. El sistema lo identifica automáticamente y muestra su estado

### Indicadores de acceso

| Color | Significado |
|---|---|
| Verde — Acceso Concedido | Membresía activa y vigente |
| Ámbar — Acceso Concedido | Membresía por vencer (menos de 7 días) — deja entrar pero avisa |
| Rojo — Acceso Denegado | Sin membresía, membresía vencida, o alumno inactivo |

### Panel del alumno

Al seleccionar a un alumno se muestra:
- **Membresía activa** — tipo de plan y fecha de vencimiento (o clases restantes si es pack)
- **Clases de hoy** — reservaciones del día con status (Confirmado / En espera)

### Registrar el check-in

1. Verifica que el indicador sea verde o ámbar
2. Haz clic en **"Registrar Check-in"**
3. El sistema guarda la entrada con fecha y hora exacta

> Un indicador ámbar significa que el alumno puede entrar hoy, pero su membresía vence pronto. Es buen momento para recordarle que renueve.

---

## 4. Alumnos

**Ruta:** `/students`

### Ver la lista de alumnos

La tabla muestra nombre, email, teléfono y status. Puedes filtrar por:
- **Barra de búsqueda** — nombre o email
- **Selector de status** — Todos / Activo / Inactivo / Fundador

### Estados de un alumno

| Estado | Puede hacer check-in | Descripción |
|---|---|---|
| **Activo** | Sí (con membresía vigente) | Miembro regular |
| **Fundador** | Sí (con membresía vigente) | Miembro fundador — mismo acceso que activo |
| **Nuevo** | No | Recién registrado, aún sin membresía activa |
| **Inactivo** | No | Dado de baja temporalmente |

### Registrar un alumno nuevo

1. Haz clic en **"+ Nuevo Miembro"** (botón dorado, esquina superior derecha)
2. Rellena el formulario:
   - **Nombre** y **Apellido** (obligatorios)
   - **Email** (obligatorio) — se usa para comunicación y login del portal
   - **Teléfono** (opcional) — útil para contactar por WhatsApp
   - **Status** — por defecto "Activo"
   - **Notas** (opcional)
3. Haz clic en **"Crear Alumno"**
4. Inmediatamente después, asígnale una membresía (ver sección 7)

### Ver el perfil de un alumno

Haz clic en cualquier fila → lleva a `/students/:id`

**El perfil muestra:**
- Información personal con botones Editar / Activar / Desactivar
- Membresía activa actual con fecha de vencimiento y clases restantes
- Botón **"+ Nueva Membresía"** para asignar o renovar
- Historial de reservaciones (clases que ha reservado)
- Historial de check-ins con fecha y hora exacta

### Editar un alumno

En el perfil, clic en **"Editar"** → modal con todos los campos modificables.

### Activar / Desactivar

- **Desactivar** — el alumno no puede hacer check-in hasta que se reactive
- **Activar** — restaura el acceso

---

## 5. Clases

**Ruta:** `/classes`

### Ver las clases

Las clases se listan en orden cronológico. Cada tarjeta muestra:
- Tipo de clase (Zumba, Pilates, Yoga, etc.)
- Fecha y hora de inicio / fin
- Instructor asignado
- Cuántos alumnos hay reservados vs. la capacidad total

### Crear una clase

1. Clic en **"+ Nueva Clase"**
2. Rellena:
   - **Tipo de clase** (selecciona del menú)
   - **Instructor** (selecciona del menú — solo aparecen los activos)
   - **Fecha**
   - **Hora de inicio** y **Hora de fin**
   - **Capacidad máxima**
   - **Notas** (opcional)
3. Clic en **"Crear Clase"**

### Tipos de clases disponibles

Zumba, Pilates, Yoga, Spinning, Cross Training, Entrenamiento Funcional, Body Combat, Danza, Stretching, Clase General.

### Cancelar una clase

En el detalle de la clase, clic en **"Cancelar clase"** → todas las reservas de esa clase quedan canceladas automáticamente.

---

## 6. Reservaciones

**Ruta:** `/reservations`

### Ver reservaciones

Filtra por:
- **Fecha** — Hoy / Esta semana / Todas
- **Clase específica** — seleccionando del menú

Cada reserva muestra alumno, clase, fecha y status.

### Status de una reservación

| Status | Significado |
|---|---|
| **Confirmado** | Tiene lugar en la clase |
| **En espera** | Clase llena, entra si alguien cancela |
| **Asistió** | Se confirmó que vino ese día |
| **No se presentó** | Tenía reserva pero no vino |
| **Cancelado** | Canceló su lugar |

### Crear una reserva

1. Clic en **"+ Nueva Reserva"**
2. Selecciona el alumno y la clase
3. Clic en **"Reservar"**

> Si la clase está llena, la reserva queda automáticamente en lista de espera.

### Marcar asistencia

En la tabla de reservas, clic en **"Asistió"** → el status cambia a `attended`. Si el alumno tiene pack de clases, se descuenta una clase automáticamente.

### Cancelar una reserva

Clic en **"Cancelar"** → el status cambia a `cancelled`.

---

## 7. Membresías

**Ruta:** `/memberships`

### Pestañas de vista

| Pestaña | Descripción |
|---|---|
| **Crítico** | Membresías que vencen en menos de 7 días — requieren atención urgente |
| **Próximo a vencer** | Membresías que vencen en los próximos 30 días |

### Tipos de planes

| Plan | Duración | Clases incluidas |
|---|---|---|
| **Mensual** | 1 mes | Ilimitadas |
| **Trimestral** | 3 meses | Ilimitadas |
| **Semestral** | 6 meses | Ilimitadas |
| **Anual** | 12 meses | Ilimitadas |
| **Pack 5 clases** | Sin fecha de vencimiento | 5 clases |
| **Pack 10 clases** | Sin fecha de vencimiento | 10 clases |
| **Pack 20 clases** | Sin fecha de vencimiento | 20 clases |
| **Pase de día** | 1 día | Ilimitadas |

Para los planes por fecha, la fecha de fin se calcula automáticamente desde la fecha de inicio. Para los packs, las clases se descuentan cada vez que el alumno asiste.

### Asignar una membresía nueva

1. Clic en **"+ Nueva Membresía"**
2. Selecciona:
   - **Alumno** (escribe el nombre para buscar)
   - **Tipo de plan**
   - **Fecha de inicio** (por defecto hoy)
   - **Método de pago** — Efectivo / Tarjeta / Transferencia
   - **Monto pagado (MXN)**
3. Clic en **"Crear"**

El pago se registra automáticamente en Caja.

### Renovar una membresía

En la lista de membresías por vencer, clic en **"Renovar"** → modal para confirmar el nuevo período y método de pago.

### Congelar / Descongelar una membresía

Si un alumno va a ausentarse temporalmente (viaje, lesión):

1. En el perfil del alumno → sección de membresía activa
2. Clic en **"Congelar"** → la membresía pausa su contador de días
3. Cuando regrese → clic en **"Descongelar"** → el tiempo restante continúa desde donde se pausó

---

## 8. Caja

**Ruta:** `/caja`

Registro completo de todos los pagos del negocio.

### Resumen del día

La parte superior muestra los totales del día:
- **Total del Día** — suma de todos los métodos
- **Efectivo**
- **Tarjeta**
- **Transferencia**

> Los pagos de membresías y ventas de inventario se registran automáticamente aquí cuando se hacen desde sus módulos. No es necesario registrarlos dos veces.

### Registrar un pago manual

Para pagos que no son membresías ni productos (ej. una consultoría, servicio extra):

1. Clic en **"+ Registrar Pago"**
2. Selecciona:
   - **Tipo** — Membresía / Pack de clases / Producto / Otro
   - **Monto (MXN)**
   - **Método de pago** — Efectivo / Tarjeta / Transferencia
   - **Notas** (opcional — p. ej. nombre del alumno)
3. Clic en **"Registrar"**

### Ver movimientos del día

La lista central muestra todos los pagos del día con tipo, método y monto.

### Corte de caja

Al final del día:

1. Clic en **"Corte de Caja"** (botón dorado)
2. El sistema muestra el total acumulado del día
3. Escribe observaciones opcionales (diferencias, detalles)
4. Clic en **"Confirmar Corte"**

Los cortes quedan guardados en la sección **"Cortes Recientes"** al final de la página con fecha, hora y totales.

---

## 9. Inventario

**Ruta:** `/inventario`

Gestión de productos en venta dentro del gimnasio (suplementos, bebidas, ropa, etc.).

### Alerta de stock bajo

Si algún producto tiene stock igual o menor a su umbral configurado, aparece un banner amarillo con los productos afectados.

### Filtros

- **Búsqueda** — nombre o código SKU del producto
- **Categoría** — Suplemento / Bebida / Ropa / Equipo / Otro

### Agregar un producto nuevo

1. Clic en **"+ Nuevo Producto"**
2. Rellena:
   - **Nombre** — ej. "Proteína Whey 500g"
   - **Precio (MXN)**
   - **Stock inicial** — unidades disponibles al crear
   - **Categoría**
   - **Alerta stock bajo** — número mínimo de unidades antes de mostrar la alerta (default: 5)
   - **Código / SKU** (opcional)
3. Clic en **"Crear Producto"**

### Registrar una venta

1. En la fila del producto, clic en **"Vender"**
2. Indica la cantidad y el método de pago
3. El sistema calcula el total automáticamente
4. Clic en **"Confirmar Venta"**

La venta descuenta el stock automáticamente y crea un movimiento en Caja.

### Reabastecer stock

1. Clic en **"Reabastecer"** en la fila del producto
2. Ingresa las unidades que llegaron
3. Clic en **"Agregar Stock"**

### Activar / Desactivar productos

Clic en **"Desact."** para ocultar un producto sin eliminar su historial de ventas. Clic en **"Activar"** para que vuelva a aparecer.

---

## 10. Reportes

**Ruta:** `/reportes`

Cuatro análisis de negocio para tomar decisiones.

### Tab — Ingresos

**Filtro:** selector de rango de fechas (inicio y fin)

Muestra:
- **Total del Período** — suma total en el rango
- **Desglose por método** — Efectivo / Tarjeta / Transferencia
- **Por Categoría** — barras por tipo de transacción (membresías, packs, productos, otros)
- **Detalle por Día** — lista de días con actividad y total por día

### Tab — Asistencia

**Filtro:** Últimos 7 / 14 / 30 / 90 días

Muestra 4 tarjetas:
- Total de reservas en el período
- Asistieron (verde)
- No se presentaron (rojo)
- Canceladas (amarillo)

### Tab — Rankings

**Filtro:** Últimos 7 / 14 / 30 / 90 días

Lista los alumnos con más check-ins en el período. El lugar #1 tiene fondo dorado. Haz clic en cualquier nombre para ir a su perfil.

### Tab — Inactivos

**Filtro:** Sin visita en +7 / +14 / +21 / +30 días

Lista los alumnos activos que **no** han hecho check-in en el período seleccionado. Útil para hacer seguimiento y recordarles que vuelvan.

Desde aquí puedes:
- Clic en el nombre → perfil del alumno
- Clic en **"WhatsApp"** → abre una conversación directa (requiere que el alumno tenga teléfono registrado)
- Clic en **"Email"** → abre el cliente de correo

---

## 11. Instructores

**Ruta:** `/instructors`

### Ver instructores

La lista muestra nombre, email, especialidad y status (Activo / Inactivo).

### Crear un instructor

1. Clic en **"+ Nuevo Instructor"**
2. Rellena nombre, apellido, email, teléfono y especialidad
3. Clic en **"Crear"**

### Editar un instructor

Clic en el nombre del instructor → clic en **"Editar"** → modal con todos los campos.

### Activar / Desactivar

Los instructores **inactivos no aparecen** disponibles al crear clases nuevas. Útil cuando un instructor está de vacaciones o terminó su relación con el gimnasio.

---

## 12. Portal del Alumno

El portal es una aplicación **separada** diseñada para que los alumnos e instructores puedan ver su información desde su celular.

### Cómo acceden los alumnos

1. El alumno entra a la URL del portal (ej. `portal.fitnessroom.mx`) desde su celular
2. Hace login con su email y contraseña
3. Ve su información personal

### Qué puede hacer un alumno en el portal

| Sección | Descripción |
|---|---|
| **Inicio** | Resumen: nombre, membresía activa con días restantes, accesos rápidos |
| **Mi QR** | Código QR personal para que lo escaneen en recepción |
| **Mis Clases** | Ver clases próximas, reservar una clase, cancelar una reservación |
| **Mi Perfil** | Ver nombre, email, teléfono, status |

### Qué puede hacer un instructor en el portal

| Sección | Descripción |
|---|---|
| **Inicio** | Accesos rápidos |
| **Mis Clases** | Ver las clases que le están asignadas |
| **Mi Perfil** | Ver nombre, email, especialidades |

### Cómo crear una cuenta para un alumno

Los alumnos **no se registran solos**. El proceso es:

1. Registra al alumno en el panel de administración (sección Alumnos)
2. El administrador crea el usuario en AWS Cognito con el email del alumno
3. El alumno recibe un correo con su contraseña temporal
4. El alumno entra al portal y cambia su contraseña

---

## 13. Configuración

**Ruta:** `/settings`

### Apariencia

Alterna entre **Modo Oscuro** (negro y dorado — predeterminado) y **Modo Claro**. El tema se guarda automáticamente.

### Idioma

Cambia entre **Español** (predeterminado) e **English** para toda la interfaz.

### Información del sistema

Muestra la versión del sistema, el entorno (Local / Producción) y la fase del proyecto.

---

## 14. Flujos completos

### Flujo 1 — Registrar un alumno nuevo y darle membresía

1. Dashboard → clic "Nuevo Miembro"
2. Llena nombre, apellido, email, teléfono → clic "Crear Alumno"
3. El sistema regresa a la lista de alumnos
4. Busca el alumno recién creado → clic en su nombre para abrir su perfil
5. En el perfil → clic en **"+ Nueva Membresía"**
6. Selecciona el plan (ej. Mensual), la fecha de inicio y el método de pago
7. Clic "Crear" → la membresía queda activa de inmediato
8. El pago se registra automáticamente en Caja

### Flujo 2 — Día de operación normal

**Mañana:**
1. Dashboard → revisa las clases del día y si hay alertas de membresías por vencer
2. Check-in → busca alumno por nombre o escanea su QR → clic "Registrar Check-in"
3. Repite para cada alumno que llega durante el día

**Durante el día:**
4. Si hay ventas de productos → Inventario → "Vender" en el producto
5. Si llega un alumno nuevo → crear alumno y asignarle membresía

**Al cierre:**
6. Caja → "Corte de Caja" → revisa el total del día → confirmar

### Flujo 3 — Programar clases y gestionar asistencia

1. Clases → clic "Nueva Clase"
2. Selecciona tipo, instructor, fecha, hora de inicio/fin y capacidad
3. Los alumnos se reservan desde Reservaciones → "Nueva Reserva" (o el alumno lo hace desde su portal)
4. El día de la clase → Reservaciones → filtra "Hoy" → marca "Asistió" por cada alumno presente

### Flujo 4 — Seguimiento de alumnos inactivos

1. Reportes → tab "Inactivos" → selecciona "+14 días"
2. Identifica los alumnos que no han venido
3. Clic en "WhatsApp" para contactarlos directamente
4. Si un alumno tiene membresía próxima a vencer → Membresías → "Renovar"

### Flujo 5 — Revisar ingresos del mes

1. Reportes → tab "Ingresos"
2. Ajusta el rango de fechas al mes completo
3. Revisa el Total del Período, el desglose por método y las categorías
4. Puedes comparar con meses anteriores cambiando las fechas

### Flujo 6 — Congelar membresía de un alumno

1. Alumnos → busca el alumno → abre su perfil
2. En la sección de membresía activa → clic en **"Congelar"**
3. Confirma. La membresía pausa su conteo de días
4. Cuando el alumno regrese → mismo perfil → **"Descongelar"**
5. Los días restantes continúan desde donde se dejaron

---

## 15. Preguntas frecuentes

**¿Qué pasa si un alumno tiene pack de clases y no fecha de vencimiento?**
El sistema usa clases restantes en lugar de fecha. Cada vez que asiste (se marca "Asistió" en Reservaciones) se descuenta una clase del pack. Cuando llega a cero, el acceso queda denegado.

**¿Puedo tener dos membresías activas para el mismo alumno?**
No. El sistema solo permite una membresía activa por alumno al mismo tiempo.

**¿Qué pasa con las reservaciones si cancelo una clase?**
Al cancelar una clase, todas sus reservaciones cambian automáticamente a estado `cancelled`.

**¿Puedo eliminar un alumno del sistema?**
Sí, desde el perfil del alumno hay un botón "Eliminar". Sin embargo, se recomienda solo Desactivar para conservar el historial. La eliminación es permanente.

**¿Cómo sé qué alumnos tienen membresía próxima a vencer?**
El Dashboard siempre muestra el contador. También puedes ir a Membresías y ver las pestañas "Crítico" (menos de 7 días) y "Próximo a vencer" (menos de 30 días).

**¿El sistema envía recordatorios automáticos?**
Sí. El sistema envía emails automáticos a los alumnos cuando su membresía está próxima a vencer (7 días antes). Esto requiere que el email del alumno esté registrado correctamente y que el servicio de correo (SES) esté configurado.

**¿Los alumnos pueden reservar clases solos?**
Sí, desde el portal del alumno pueden ver las clases disponibles y hacer/cancelar reservaciones sin necesidad de que el staff lo haga por ellos.

**¿Cómo imprimo el QR de un alumno?**
En el perfil del alumno hay un botón para ver/descargar el QR como imagen. El alumno también puede verlo desde su portal en la sección "Mi QR" y mostrarlo desde el celular.

---

## Atajos de navegación

El menú lateral izquierdo siempre está visible. La sección activa se resalta con fondo dorado.

| Sección | Acceso rápido |
|---|---|
| Dashboard | Inicio de la aplicación |
| Check-in | Acceso rápido — botón dorado en el menú |
| Alumnos | Lista completa y perfiles |
| Clases | Calendario y gestión |
| Reservaciones | Asignación y asistencia |
| Membresías | Planes y alertas de vencimiento |
| Caja | Pagos y corte de caja |
| Inventario | Productos y ventas |
| Reportes | Ingresos, asistencia, rankings |
| Instructores | Equipo de instructores |
| Configuración | Tema, idioma, información |

---

*Fitness Room System · v2.5.0 · Para dudas o soporte, contacta al administrador del sistema*
