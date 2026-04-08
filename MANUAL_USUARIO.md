# Manual de Usuario — Fitness Room System

**Sistema de gestión integral para Fitness Room**
Versión 1.0 · Fase 1 completada

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
12. [Configuración](#12-configuracion)
13. [Flujos completos de ejemplo](#13-flujos-completos)

---

## 1. Acceso al sistema

### Pantalla de login

Al abrir la aplicación se muestra la pantalla de inicio de sesión.

**Campos:**
- **Email** — correo registrado en el sistema
- **Contraseña** — contraseña asignada por el administrador

**Botón "Iniciar sesión"** → valida credenciales con AWS Cognito y abre el dashboard.

> **Nota local de desarrollo:** con `VITE_ENV=development` el login se omite automáticamente.

---

## 2. Dashboard (Inicio)

**Ruta:** `/`

El dashboard muestra un resumen de toda la operación del día en una sola pantalla.

### Acciones rápidas (fila superior)

| Botón | Descripción | Ruta |
|---|---|---|
| **Check-in** | Registrar entrada de un alumno | `/checkin` |
| **Nuevo Miembro** | Registrar un alumno nuevo | `/students` |
| **Nueva Clase** | Programar una clase | `/classes` |
| **Membresía** | Asignar plan a un alumno | `/memberships` |

### Alerta de membresías por vencer

Si hay membresías que vencen en los próximos **7 días**, aparece un banner amarillo en la parte superior. Hacer clic en él lleva a la sección de Membresías.

### Tarjetas de estadísticas

- **Miembros Activos** — total de alumnos con status `active` o `founder`
- **Clases Hoy** — clases programadas para hoy
- **Instructores** — instructores activos registrados
- **Por Vencer** — membresías que vencen en los próximos 7 días

### Panel inferior izquierdo — Próximas Clases

Lista las clases programadas para hoy con hora, instructor y número de reservas/capacidad.

### Panel inferior derecho — Membresías por Vencer

Lista hasta 5 membresías próximas a expirar con nombre del alumno, tipo de plan y fecha de vencimiento. El link "Ver →" abre el perfil del alumno.

### Widget Rankings

Muestra los 5 alumnos con más check-ins en los últimos 30 días. El primero aparece con fondo dorado.

### Widget Ingresos de Hoy

Muestra el total recaudado hoy dividido en Efectivo / Tarjeta / Transferencia. El link "Ver caja →" lleva a la sección de Caja.

---

## 3. Check-in

**Ruta:** `/checkin`

Esta es la pantalla más usada durante el día, diseñada para una operación rápida en recepción.

### Cómo registrar un check-in

1. Escribe **2 o más letras** del nombre del alumno en el campo de búsqueda
2. Aparece una lista desplegable con hasta 10 coincidencias
3. **Haz clic en el alumno** → el panel derecho muestra su estado inmediatamente

### Indicadores de acceso

| Color | Icono | Significado |
|---|---|---|
| Verde | ✅ Acceso Concedido | Membresía activa y vigente |
| Ámbar | ⚠️ Acceso Concedido | Membresía por vencer (menos de 7 días) |
| Rojo | ❌ Acceso Denegado | Sin membresía, vencida o alumno inactivo |

### Panel de información del alumno

Muestra:
- **Membresía activa** — tipo de plan y fecha de vencimiento (o clases restantes si es pack)
- **Clases de hoy** — lista de clases reservadas para el día con status (Confirmado / En espera)

### Registrar el check-in

1. Verifica que el indicador sea verde o ámbar
2. Haz clic en **"✓ Registrar Check-in"**
3. El sistema registra la entrada y muestra confirmación

---

## 4. Alumnos

**Ruta:** `/students`

Gestión completa del padrón de alumnos.

### Ver la lista de alumnos

La tabla muestra nombre, email, teléfono y status de cada alumno. Puede filtrarse por:
- **Barra de búsqueda** — nombre o email
- **Selector de status** — Todos / Activo / Inactivo / Fundador

### Crear un alumno nuevo

1. Haz clic en **"+ Nuevo Miembro"** (botón dorado, esquina superior derecha)
2. Rellena el formulario:
   - **Nombre** * y **Apellido** *
   - **Email** * — se usa para login y contacto
   - **Teléfono** (opcional) — formato libre
   - **Status** — Activo / Inactivo / Fundador
   - **Notas** (opcional)
3. Haz clic en **"Crear Alumno"**

### Ver el perfil de un alumno

Haz clic en cualquier fila de la tabla → lleva a `/students/:id`

**El perfil muestra:**
- Información personal y botones Editar / Activar / Desactivar
- Membresía activa actual con fecha de vencimiento y clases restantes
- Botón **"+ Nueva Membresía"** para asignar o renovar un plan
- Historial de reservaciones (clases reservadas)
- Historial de check-ins con fecha y hora

### Editar un alumno

En el perfil, haz clic en **"Editar"** → se abre un modal con todos los campos editables.

### Activar / Desactivar

- **Desactivar** — el alumno deja de tener acceso (check-in denegado)
- **Activar** — restaura el acceso

---

## 5. Clases

**Ruta:** `/classes`

Calendario y gestión de sesiones de fitness.

### Ver las clases

Las clases se listan en orden cronológico. Cada tarjeta muestra:
- Tipo de clase (Yoga, CrossFit, Spinning, etc.)
- Fecha y hora de inicio
- Duración en minutos
- Instructor asignado
- Capacidad y número de reservas actuales

### Crear una clase

1. Haz clic en **"+ Nueva Clase"**
2. Rellena:
   - **Tipo de clase** (selecciona del menú)
   - **Instructor** (selecciona del menú)
   - **Fecha** *
   - **Hora de inicio** * y **Hora de fin** *
   - **Capacidad máxima** *
   - **Notas** (opcional)
3. Haz clic en **"Crear Clase"**

### Cancelar una clase

En el detalle de la clase, haz clic en **"Cancelar clase"** → todas las reservas pasan a status `cancelled` automáticamente.

---

## 6. Reservaciones

**Ruta:** `/reservations`

Gestión de reservas por clase.

### Ver reservaciones

Se pueden filtrar por:
- **Fecha** — Hoy / Esta semana / Todas
- **Clase específica** — seleccionando del menú

Cada reserva muestra alumno, clase, fecha y status (Confirmado / En espera / Asistió / No se presentó / Cancelado).

### Crear una reserva

1. Haz clic en **"+ Nueva Reserva"**
2. Selecciona el alumno y la clase
3. Haz clic en **"Reservar"**

> Si la clase está llena, la reserva queda en lista de espera (`waitlisted`).

### Marcar asistencia

En la tabla de reservas, haz clic en **"Asistió"** para confirmar que el alumno se presentó. Esto cambia el status a `attended`.

### Cancelar una reserva

Haz clic en el botón **"Cancelar"** junto a la reserva → status cambia a `cancelled`.

---

## 7. Membresías

**Ruta:** `/memberships`

Control de planes y alertas de vencimiento.

### Tabs de vista

| Tab | Descripción |
|---|---|
| **Crítico** | Membresías que vencen en menos de 7 días |
| **Próximo a vencer** | Membresías que vencen en los próximos 30 días |

### Crear una membresía

1. Haz clic en **"+ Nueva Membresía"**
2. Selecciona:
   - **Alumno** — escribe el nombre para buscar
   - **Tipo de plan** (ver tabla abajo)
   - **Fecha de inicio**
   - **Método de pago**
   - **Monto pagado**
3. Haz clic en **"Crear"**

### Tipos de planes disponibles

| Plan | Duración | Clases |
|---|---|---|
| Mensual | 1 mes | Ilimitadas |
| Trimestral | 3 meses | Ilimitadas |
| Semestral | 6 meses | Ilimitadas |
| Anual | 12 meses | Ilimitadas |
| Pack 5 clases | Sin fecha | 5 clases |
| Pack 10 clases | Sin fecha | 10 clases |
| Pack 20 clases | Sin fecha | 20 clases |
| Pase de día | 1 día | Ilimitadas |

### Renovar una membresía

En la lista, haz clic en **"Renovar"** junto a cualquier membresía → se abre un modal para confirmar el nuevo período y el método de pago.

---

## 8. Caja

**Ruta:** `/caja`

Registro de todos los pagos recibidos y generación del corte de caja diario.

### Tarjetas de resumen

La parte superior muestra los totales del día:
- **Total del Día** — suma de todos los métodos
- **Efectivo**
- **Tarjeta**
- **Transferencia**

### Registrar un pago

1. Haz clic en **"+ Registrar Pago"**
2. Selecciona:
   - **Tipo de pago** — Membresía / Pack de clases / Producto / Otro
   - **Monto (MXN)** *
   - **Método de pago** — Efectivo / Tarjeta / Transferencia
   - **Notas** (opcional — p.ej. nombre del alumno)
3. Haz clic en **"Registrar"**

> **Nota:** Los pagos de membresías y ventas de inventario se registran automáticamente. El registro manual es para pagos que no entran por esas rutas.

### Ver movimientos del día

La lista central muestra todos los pagos del día con tipo, método y monto.

### Corte de caja

Al final del día:
1. Haz clic en **"Corte de Caja"** (botón dorado)
2. El sistema muestra el total acumulado del día
3. Escribe observaciones opcionales
4. Haz clic en **"Confirmar Corte"**

Los cortes quedan guardados en la sección **"Cortes Recientes"** al final de la página.

---

## 9. Inventario

**Ruta:** `/inventario`

Gestión de productos y registro de ventas.

### Alerta de stock bajo

Si algún producto activo tiene stock igual o menor a su umbral configurado, aparece un banner amarillo con los nombres de los productos afectados.

### Filtros

- **Búsqueda** — nombre o código SKU del producto
- **Categoría** — Suplemento / Bebida / Ropa / Equipo / Otro

### Crear un producto

1. Haz clic en **"+ Nuevo Producto"**
2. Rellena:
   - **Nombre** * — ej. "Proteína Whey 500g"
   - **Precio (MXN)** *
   - **Stock inicial** — unidades disponibles al crear
   - **Categoría**
   - **Alerta stock bajo** — mínimo de unidades antes de mostrar la alerta (default: 5)
   - **Código / SKU** (opcional)
3. Haz clic en **"Crear Producto"**

### Vender un producto

1. En la fila del producto, haz clic en **"Vender"**
2. Indica la cantidad y el método de pago
3. El sistema muestra el total a cobrar
4. Haz clic en **"Confirmar Venta"**

> La venta descuenta el stock automáticamente y crea un movimiento en Caja.

### Reabastecer

1. Haz clic en **"Reabastecer"** en la fila del producto
2. Ingresa las unidades a agregar
3. Haz clic en **"Agregar Stock"**

### Activar / Desactivar productos

El botón **"Desact."** / **"Activar"** en cada fila oculta/muestra el producto sin eliminarlo del historial.

---

## 10. Reportes

**Ruta:** `/reportes`

Análisis de negocio con cuatro vistas configurables.

### Tab Ingresos

**Filtro:** Selector de rango de fechas (inicio y fin)

**Muestra:**
- **Total del Período** — suma total en el rango seleccionado
- **Efectivo / Tarjeta / Transferencia** — desglose por método
- **Por Categoría** — barras proporcionales por tipo de transacción (membresías, packs, productos, otros)
- **Detalle por Día** — lista de días con actividad, mostrando número de movimientos y total

### Tab Asistencia

**Filtro:** Últimos 7 / 14 / 30 / 90 días

**Muestra 4 tarjetas:**
- Total Reservas
- Asistieron (verde)
- No se presentaron (rojo)
- Canceladas (amarillo)

### Tab Rankings

**Filtro:** Últimos 7 / 14 / 30 / 90 días

Lista los alumnos con más check-ins en el período. El lugar #1 aparece con fondo dorado. Cada nombre es un link al perfil del alumno.

### Tab Inactivos

**Filtro:** Sin visita en +7 / +14 / +21 / +30 días

Lista los alumnos activos/fundadores que **no** han hecho check-in en el período seleccionado. Desde aquí puedes:
- Hacer clic en el nombre para ir a su perfil
- Haz clic en **"WhatsApp"** para abrir una conversación directa con el alumno (requiere número de teléfono)
- Haz clic en **"Email"** para abrir el cliente de correo

---

## 11. Instructores

**Ruta:** `/instructors`

Gestión del equipo de instructores.

### Ver instructores

La lista muestra nombre, email, especialidad y status (Activo / Inactivo).

### Crear un instructor

1. Haz clic en **"+ Nuevo Instructor"**
2. Rellena nombre, apellido, email, teléfono y especialidad
3. Haz clic en **"Crear"**

### Activar / Desactivar

Los instructores inactivos no aparecen disponibles al crear clases.

---

## 12. Configuración

**Ruta:** `/settings`

### Apariencia

Alterna entre **Modo Oscuro** y **Modo Claro**. El tema se guarda localmente y persiste entre sesiones.

### Idioma

Cambia el idioma de la interfaz entre **Español** (default) e **English**.

### Información del sistema

Muestra la versión, el entorno (Local / Producción) y la fase del proyecto.

---

## 13. Flujos completos

### Flujo 1: Registrar un alumno nuevo y asignarle membresía

1. **Dashboard** → clic en "Nuevo Miembro"
2. Llena nombre, apellido, email, teléfono → clic "Crear Alumno"
3. El sistema abre la lista de alumnos
4. Busca el alumno recién creado → clic en su nombre para abrir el perfil
5. En el perfil → clic en **"+ Nueva Membresía"**
6. Selecciona el plan (ej. Mensual), fecha de inicio y método de pago
7. Clic "Crear" → la membresía queda activa
8. El pago se registra automáticamente en Caja

### Flujo 2: Día de operación normal (mañana)

1. **Check-in** → busca alumno → clic en su nombre → clic "Registrar Check-in"
2. Repite para cada alumno que llega
3. Si hay ventas de productos → **Inventario** → "Vender" en el producto correspondiente
4. Al final del día → **Caja** → "Corte de Caja" → confirmar

### Flujo 3: Programar una clase y gestionar reservaciones

1. **Clases** → clic "Nueva Clase"
2. Selecciona tipo, instructor, fecha, hora de inicio/fin y capacidad
3. Los alumnos se reservan desde **Reservaciones** → "Nueva Reserva"
4. El día de la clase, abre **Reservaciones** → filtra "Hoy" → marca "Asistió" por cada alumno presente

### Flujo 4: Seguimiento de alumnos inactivos

1. **Reportes** → tab "Inactivos" → selecciona "+14 días"
2. Identifica los alumnos que no han venido
3. Haz clic en "WhatsApp" para contactar directamente desde la app
4. Si un alumno tiene membresía próxima a vencer → **Membresías** → "Renovar"

### Flujo 5: Revisión de ingresos del mes

1. **Reportes** → tab "Ingresos"
2. El período default ya apunta al mes actual (primer día hasta hoy)
3. Ajusta las fechas con el selector si necesitas un período diferente
4. Revisa el Total del Período, el desglose por método y el gráfico por categoría

---

## Atajos de navegación

El sidebar izquierdo siempre está visible. La sección activa se resalta con fondo dorado.

| Icono | Sección |
|---|---|
| 🏠 | Dashboard |
| ⚡ | Check-in (acción rápida — botón dorado) |
| 👥 | Alumnos |
| 📅 | Clases |
| ✅ | Reservaciones |
| 💳 | Membresías |
| 🧾 | Caja |
| 📦 | Inventario |
| 📊 | Reportes |
| 👨‍🏫 | Instructores |
| ⚙️ | Configuración |

---

*Fitness Room System · v1.0.0-beta · Fase 1 Core*
