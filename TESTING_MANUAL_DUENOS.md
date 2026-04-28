# 🏋️ Guía de Pruebas Manuales — Fitness Room

Hola! Antes de soltar el sistema a operar todos los días, necesitamos probar que todo funciona bien. Esta guía es para que tú mismo, como dueño, vayas paso a paso verificando cada flujo.

No tienes que hacer todo de un jalón. Puedes ir por bloques (un día haces Check-in y Alumnos, otro día Membresías y Caja, etc).

**Si algo no funciona como dice aquí, mándame captura de pantalla o mensaje describiendo qué pasó y en qué paso.**

---

## 📱 Qué vas a probar

Son 2 aplicaciones separadas:

1. **Panel de administración** → https://admin.fitnessroom.mx (para ti y recepción)
2. **Portal del alumno** → https://portal.fitnessroom.mx (para tus alumnos e instructores)

Y las landings públicas:

3. **Landing del gym** → https://fitnessroom.mx
4. **Landing plataforma** → https://platform.fitnessroom.mx

---

## ✅ Antes de empezar

- [ ] Tienes tu usuario y contraseña del admin
- [ ] Tienes al menos 1 alumno de prueba creado (puede ser tú mismo con otro email)
- [ ] Tienes Chrome o Safari actualizado
- [ ] Tienes el celular a la mano para probar el QR

---

# 🔐 BLOQUE 1 — Login y acceso

**URL:** https://admin.fitnessroom.mx

### 1.1 Login normal
1. Entra a la URL
2. Escribe tu email y contraseña
3. Clic en **Iniciar sesión**

✅ Esperado: Te lleva al Dashboard (pantalla principal con tarjetas de estadísticas).

### 1.2 Credenciales incorrectas
1. Cierra sesión
2. Escribe tu email pero con una contraseña inventada
3. Intenta entrar

✅ Esperado: Te muestra un mensaje de error, no te deja pasar.

### 1.3 Cambio de idioma
1. Ve a **Configuración** (abajo a la izquierda)
2. Cambia idioma a **English**
3. Regresa al Dashboard

✅ Esperado: Todo el texto cambió a inglés. Regrésalo a Español.

### 1.4 Cambio de tema (oscuro/claro)
1. En Configuración cambia entre tema oscuro y claro
2. Navega a otras páginas

✅ Esperado: El color de fondo cambia en todas las páginas. Déjalo en el que prefieras.

### 1.5 Cerrar sesión
1. Clic en tu avatar/nombre arriba a la derecha
2. Clic en **Cerrar sesión**

✅ Esperado: Te regresa a la pantalla de login.

---

# 🏠 BLOQUE 2 — Dashboard (Inicio)

**Ruta:** `/`

### 2.1 Revisa que las tarjetas se carguen
Deberías ver:
- [ ] **Miembros Activos** (número)
- [ ] **Clases Hoy** (número)
- [ ] **Instructores** (número)
- [ ] **Por Vencer** (membresías que vencen pronto)

### 2.2 Prueba los botones de acciones rápidas
Clic en cada uno y verifica que te lleve a la página correcta:
- [ ] **Check-in** → página de check-in
- [ ] **Nuevo Miembro** → modal para crear alumno
- [ ] **Nueva Clase** → modal para crear clase
- [ ] **Membresía** → modal de nueva membresía

Cierra cada modal sin guardar nada (clic en la X o fuera del modal).

### 2.3 Widgets laterales
- [ ] Panel **Próximas Clases** muestra las clases de hoy (o mensaje de "no hay")
- [ ] Panel **Por Vencer** muestra membresías que vencen pronto (o mensaje de "no hay")
- [ ] Panel **Top alumnos** muestra ranking de los más asistentes (si ya hay check-ins)
- [ ] Panel de **Ingresos del día** muestra total, efectivo, tarjeta y transferencia

### 2.4 Banner de alerta
Si hay membresías que vencen en menos de 7 días:
- [ ] Aparece un banner amarillo arriba
- [ ] Clic en el banner → te lleva a Membresías

---

# 👥 BLOQUE 3 — Alumnos (Miembros)

**Ruta:** `/students`

### 3.1 Crear un alumno nuevo
1. Clic en **+ Nuevo Miembro**
2. Llena:
   - Nombre: `Juan`
   - Apellido: `Pérez`
   - Email: `juan.test@test.com` (usa un email real si quieres probar notificaciones)
   - Teléfono: `5512345678`
3. Clic en **Guardar**

✅ Esperado: El alumno aparece en la lista y es **Activo**.

### 3.2 Validaciones al crear
Intenta crear otro alumno con el **mismo email** del anterior.

✅ Esperado: Te da error diciendo que el email ya existe. No lo crea.

Intenta crear uno con email mal escrito (sin @).

✅ Esperado: Te marca error de formato.

### 3.3 Buscar alumno
1. Escribe "Juan" en la barra de búsqueda
2. Luego borra y escribe parte del email

✅ Esperado: La lista se filtra en tiempo real.

### 3.4 Filtros por estado
Prueba cada filtro:
- [ ] Todos
- [ ] Activo
- [ ] Inactivo
- [ ] Fundador

✅ Esperado: La lista solo muestra los que coinciden con el filtro.

### 3.5 Ver detalle del alumno
1. Clic sobre Juan Pérez
2. Verifica que se vean todas estas secciones:
   - [ ] Foto/avatar, nombre, estado
   - [ ] Botones: Editar, Desactivar, + Nueva Membresía
   - [ ] Tarjeta de membresía (probablemente "Sin membresía activa" al inicio)
   - [ ] Código QR del alumno
   - [ ] Historial de membresías (vacío al inicio)
   - [ ] Historial de check-ins (vacío al inicio)

### 3.6 Editar alumno
1. Clic en **Editar**
2. Cambia el teléfono
3. Agrega un contacto de emergencia
4. Guarda

✅ Esperado: Los cambios se reflejan inmediatamente.

### 3.7 Desactivar / Activar
1. Clic en **Desactivar** → confirma
2. Ve a la lista, filtra por **Inactivo** → debe aparecer
3. Entra de nuevo al perfil, clic en **Activar**
4. Filtra por **Activo** → debe aparecer

### 3.8 QR del alumno
1. En el perfil, busca la sección de QR
2. Clic en descargar (si hay botón)

✅ Esperado: Se descarga o se ve una imagen QR clara.

---

# 💳 BLOQUE 4 — Membresías

**Ruta:** `/memberships`

### 4.1 Asignar membresía a un alumno
1. Ve al perfil de Juan Pérez
2. Clic en **+ Nueva Membresía**
3. Elige plan **Mensual**
4. Fecha de inicio: hoy
5. Método de pago: **Efectivo**
6. Monto: el que corresponda (ej. $800)
7. Guarda

✅ Esperado:
- La membresía aparece activa en el perfil
- Aparece la fecha de vencimiento
- Se registró un movimiento en Caja (lo verificamos en el Bloque 9)

### 4.2 Probar diferentes tipos de planes
Crea otro alumno de prueba y asigna:
- [ ] Plan **Trimestral** (3 meses)
- [ ] Plan **Pack 10 clases** (sin fecha, contador de clases)
- [ ] Plan **Pase de día**

✅ Esperado: Cada tipo se muestra correctamente con sus datos.

### 4.3 Renovar membresía
1. Ve a la página de **Membresías**
2. Busca una membresía activa
3. Clic en **Renovar**
4. Elige plan, método de pago, monto
5. Guarda

✅ Esperado: Se crea una nueva membresía que inicia donde terminaba la anterior.

### 4.4 Congelar / Descongelar
1. Entra al perfil de un alumno con membresía activa
2. Clic en **Congelar** (o desde la tarjeta de membresía)
3. Verifica que aparezca como **Congelada**
4. Clic en **Descongelar**

✅ Esperado: La membresía vuelve a estar activa. El tiempo restante se conserva.

### 4.5 Alerta de vencimiento
Ve a Membresías → verifica las 2 pestañas:
- [ ] **Crítico** — membresías que vencen en menos de 7 días
- [ ] **Próximo a vencer** — vencen en menos de 30 días

### 4.6 Cancelar membresía
1. Elige una membresía de prueba
2. Cancélala
3. Intenta hacer check-in con ese alumno (Bloque 6)

✅ Esperado: La membresía aparece como cancelada. El alumno ya no puede entrar.

---

# 🏃 BLOQUE 5 — Clases

**Ruta:** `/classes`

### 5.1 Crear instructor (si no hay)
Antes de crear clases necesitas al menos 1 instructor.

1. Ve a `/instructors`
2. Clic en **+ Nuevo Instructor**
3. Llena: nombre, apellido, email, teléfono, especialidad
4. Guarda

### 5.2 Crear una clase
1. Ve a `/classes` → **+ Nueva Clase**
2. Llena:
   - Tipo: **Zumba** (o el que tengas)
   - Instructor: el que creaste
   - Fecha: mañana
   - Hora inicio: 7:00 AM
   - Hora fin: 8:00 AM
   - Cupo: 15
   - Ubicación: Presencial
3. Guarda

✅ Esperado: La clase aparece en la lista.

### 5.3 Vista de calendario
- [ ] Alterna entre vista de calendario y lista
- [ ] Verifica que la clase aparezca en la fecha correcta

### 5.4 Editar clase
1. Entra a la clase
2. Cambia el cupo de 15 a 20
3. Guarda

✅ Esperado: El cambio se refleja.

### 5.5 Cancelar clase
1. Crea otra clase de prueba
2. Ciérrela/Cancélala desde el detalle

✅ Esperado: La clase aparece marcada como **CANCELADA**.

---

# 📅 BLOQUE 6 — Reservaciones

**Ruta:** `/reservations`

### 6.1 Reservar clase manualmente (desde admin)
1. Clic en **+ Nueva Reserva**
2. Elige alumno: Juan Pérez
3. Elige la clase que creaste ayer
4. Guarda

✅ Esperado: Aparece en la lista con estado **Confirmada**.

### 6.2 Filtros
Prueba cada filtro:
- [ ] Hoy
- [ ] Esta semana
- [ ] Todas

### 6.3 Marcar asistencia
1. Encuentra la reserva de Juan
2. Clic en **Asistió**

✅ Esperado: El estado cambia a **Asistió**.

### 6.4 Cancelar reservación
1. Crea otra reserva de prueba
2. Clic en **Cancelar**

✅ Esperado: Se marca como **Cancelada**. El cupo se libera.

### 6.5 Probar lista de espera (cupo lleno)
1. Crea una clase con cupo = 1
2. Reserva a un alumno → confirma
3. Reserva a otro alumno → debería ir a lista de espera

✅ Esperado: El segundo alumno aparece como **En espera**.

---

# ✋ BLOQUE 7 — Check-in (el más importante)

**Ruta:** `/checkin`

Este es el flujo que más vas a usar todos los días. Pruébalo con calma.

### 7.1 Check-in por nombre
1. Entra a `/checkin`
2. Escribe "Juan" en el buscador
3. Clic sobre Juan Pérez

✅ Esperado: Aparece el panel derecho con:
- [ ] Indicador **verde** ✅ (si tiene membresía activa)
- [ ] Nombre de su membresía y fecha de vencimiento
- [ ] Si aplica: reservaciones del día

4. Clic en **Registrar Check-in**

✅ Esperado: Se registra exitosamente. Si vas al perfil de Juan, aparece en el historial de check-ins.

### 7.2 Check-in con membresía por vencer (⚠️ ámbar)
1. Si tienes un alumno con membresía que vence en <7 días, búscalo
2. Verifica que el indicador sea **ámbar** ⚠️ con advertencia

✅ Esperado: Permite el acceso pero muestra alerta.

### 7.3 Check-in con alumno sin membresía (❌ rojo)
1. Crea un alumno nuevo y NO le asignes membresía
2. Busca ese alumno en check-in

✅ Esperado: Indicador **rojo**, mensaje "No tiene membresía activa". No permite registrar.

### 7.4 Check-in con alumno inactivo
1. Desactiva un alumno
2. Intenta hacer check-in

✅ Esperado: Indicador rojo, "El miembro está inactivo".

### 7.5 Check-in con membresía expirada
1. Busca un alumno con membresía cancelada o expirada

✅ Esperado: Rojo, "La membresía ha expirado / cancelada".

### 7.6 Check-in por QR (celular)
1. Abre `/checkin` en la compu
2. Clic en el ícono de cámara/QR
3. En tu celular, abre el portal `portal.fitnessroom.mx`, entra al QR
4. Escanea el QR de la pantalla del celular con la cámara de la compu

✅ Esperado: Te identifica al alumno automáticamente y muestra su panel.

### 7.7 Modo Kiosco (para tablet en recepción)
**Ruta:** `/checkin-kiosk`

1. Abre `/checkin-kiosk` en una tablet o pantalla grande
2. Se ve la pantalla completa con el escáner QR
3. Escanea QR de un alumno
4. Si tiene clase reservada hoy → se auto-selecciona
5. Confirma

✅ Esperado:
- [ ] Pantalla verde de éxito
- [ ] Se reinicia automáticamente después de 5 segundos
- [ ] Si el QR no es válido → pantalla roja

---

# 👨‍🏫 BLOQUE 8 — Instructores

**Ruta:** `/instructors`

### 8.1 Crear, editar, desactivar
Ya creaste uno en el Bloque 5. Ahora:
- [ ] Edita su biografía/especialidad
- [ ] Desactívalo → verifica que al crear una clase nueva ya no aparezca en el selector
- [ ] Actívalo de nuevo

### 8.2 Ver clases asignadas
1. Entra al perfil del instructor
2. Verifica que aparezcan las clases que tiene asignadas

---

# 💰 BLOQUE 9 — Caja

**Ruta:** `/caja`

### 9.1 Verifica que los pagos se registran automáticamente
Si asignaste una membresía pagada en el Bloque 4:
- [ ] Debe aparecer en Caja como movimiento del día
- [ ] Con el monto y método de pago correctos

### 9.2 Registrar pago manual
1. Clic en **+ Registrar Pago**
2. Llena concepto, monto, método
3. Guarda

✅ Esperado: Aparece en la lista y suma al total del día.

### 9.3 Resumen del día
- [ ] Total general del día
- [ ] Desglose: Efectivo / Tarjeta / Transferencia
- [ ] Movimientos listados cronológicamente

### 9.4 Corte de Caja
1. Clic en **Corte de Caja**
2. Verifica que muestre el total del día
3. Agrega notas si quieres
4. Confirma

✅ Esperado: El corte aparece en **Cortes Recientes** con fecha, hora, total.

---

# 📦 BLOQUE 10 — Inventario

**Ruta:** `/inventario`

### 10.1 Crear producto
1. Clic en **+ Nuevo Producto**
2. Llena:
   - Nombre: `Agua 500ml`
   - Precio: `$20`
   - Stock: `30`
   - Categoría: **Bebida**
   - Umbral de stock bajo: `5`
3. Guarda

### 10.2 Vender producto
1. Clic en **Vender** sobre el producto
2. Cantidad: 2
3. Método: Efectivo
4. Confirma

✅ Esperado:
- [ ] Stock baja de 30 a 28
- [ ] Aparece un movimiento en Caja de $40

### 10.3 Probar alerta de stock bajo
1. Crea producto con stock = 3 y umbral = 5
2. Ve a `/inventario`

✅ Esperado: Aparece banner de **Stock Bajo** en rojo/amarillo.

### 10.4 Reabastecer
1. Clic en **Reabastecer**
2. Cantidad: 20
3. Guarda

✅ Esperado: Stock se actualiza.

### 10.5 Intentar vender más del stock
Intenta vender 100 unidades cuando solo hay 28.

✅ Esperado: Error de validación, no te deja.

---

# 📊 BLOQUE 11 — Reportes

**Ruta:** `/reportes`

### 11.1 Ingresos
1. Ve a pestaña **Ingresos**
2. Elige rango: **Últimos 7 días**
3. Verifica:
   - [ ] Total del periodo
   - [ ] Desglose por método (efectivo/tarjeta/transferencia)
   - [ ] Desglose por categoría (membresías/packs/productos)
   - [ ] Detalle día por día
4. Si hay opción de exportar PDF/Excel, pruébala

### 11.2 Asistencia
1. Pestaña **Asistencia**
2. Filtro: últimos 30 días
3. Verifica que muestre:
   - [ ] Total reservas
   - [ ] Asistencias
   - [ ] No presentados
   - [ ] Canceladas

### 11.3 Rankings
1. Pestaña **Rankings**
2. Filtro: últimos 30 días

✅ Esperado: Top alumnos por check-ins, el #1 con medalla dorada.

Clic en un alumno → te lleva a su perfil.

### 11.4 Inactivos
1. Pestaña **Inactivos**
2. Filtro: 14 días sin asistir

✅ Esperado: Lista de alumnos que no han venido. Cada uno con botones de **WhatsApp** y **Email**.

Clic en WhatsApp → abre chat con ese alumno (si tiene teléfono registrado).

---

# ⚙️ BLOQUE 12 — Configuración

**Ruta:** `/settings`

### 12.1 Información del gym
1. Actualiza nombre, dirección, contacto
2. Guarda

### 12.2 Notificaciones por email
- [ ] Activa/desactiva recordatorios de vencimiento
- [ ] Activa/desactiva alertas de inactividad
- [ ] Prueba la **lista de supresión** (emails que no quieres que reciban nada)

### 12.3 Usuarios del sistema
**Ruta:** `/users`

1. Clic en **+ Nuevo Usuario**
2. Llena email, nombre, rol (Admin/Staff)
3. Guarda

✅ Esperado: Le llega email de invitación al usuario nuevo con contraseña temporal.

### 12.4 Cambiar contraseña
1. En settings, busca **Cambiar contraseña**
2. Ingresa actual, y una nueva

✅ Esperado: Al cerrar sesión y volver a entrar, debes usar la nueva contraseña.

---

# 📱 BLOQUE 13 — Portal del Alumno

**URL:** https://portal.fitnessroom.mx

Este es el lado del alumno. Prueba con la cuenta de Juan Pérez (o crea un alumno con un email al que tengas acceso).

### 13.1 Login del alumno
1. El alumno recibe invitación por email (cuando lo creaste)
2. Inicia sesión con email y contraseña

✅ Esperado: Entra al portal con navegación inferior (bottom nav).

### 13.2 Dashboard del alumno
- [ ] Saludo con su nombre
- [ ] Tarjeta con estado de su membresía (tipo, días restantes o clases restantes)
- [ ] Accesos rápidos: Mi QR, Mis Clases, Perfil

### 13.3 Mi QR
1. Clic en **Mi QR** en la nav inferior
2. Verifica:
   - [ ] Se ve el QR grande
   - [ ] Es legible desde la pantalla
   - [ ] Lo puede descargar o guardar

✅ Este QR lo usará el alumno para check-in en el gym.

### 13.4 Reservar clase desde portal
1. Clic en **Mis Clases**
2. Lista de próximas clases disponibles
3. Clic en reservar en una clase

✅ Esperado: Aparece como **Confirmada**. Vas al admin y debe aparecer en la reserva.

### 13.5 Cancelar reserva
1. En el portal, busca la clase que reservaste
2. Clic en cancelar

✅ Esperado: Se quita. El cupo se libera en el admin.

### 13.6 Clase llena → lista de espera
Si una clase está llena:

✅ Esperado: Le muestra mensaje de lista de espera.

### 13.7 Sin membresía activa
Si el alumno no tiene membresía:

✅ Esperado: Mensaje claro "No tienes membresía activa" en dashboard. No puede reservar.

### 13.8 Perfil
1. Clic en **Perfil**
2. Verifica que muestre sus datos

---

# 🌐 BLOQUE 14 — Landings públicas

### 14.1 Landing del gym
Entra a: https://fitnessroom.mx

- [ ] Carga sin errores
- [ ] Se ve bien en computadora
- [ ] Se ve bien en celular
- [ ] Los links a portal/admin funcionan

### 14.2 Landing de plataforma
Entra a: https://platform.fitnessroom.mx

- [ ] Carga sin errores
- [ ] Links funcionan

---

# 🧪 BLOQUE 15 — Pruebas cruzadas (flujos completos)

Estos son escenarios reales de principio a fin.

### Flujo A — Nuevo alumno de cero al check-in

1. Crear alumno Juan Pérez ✅
2. Asignar membresía mensual ✅
3. Verificar que el pago apareció en Caja ✅
4. Enviarle invitación para que active su cuenta en el portal
5. Alumno entra al portal → ve su QR
6. Alumno llega al gym → recepción hace check-in con QR
7. Verificar que el check-in aparece en el perfil ✅

### Flujo B — Reservación y asistencia

1. Crear clase "Zumba lunes 7 AM"
2. Desde el portal, Juan reserva la clase
3. Desde admin, ver la reservación en `/reservations`
4. El lunes hacer check-in de Juan
5. Marcar asistencia en la reservación
6. Verificar que aparece en reportes de asistencia

### Flujo C — Pack de clases

1. Asignar a un alumno un **Pack 10 clases**
2. Hacer check-in 3 veces en diferentes días
3. Verificar que `clases_remaining` baja a 7
4. En el portal, verificar que muestra "7 clases restantes"

### Flujo D — Corte de caja del día

1. A lo largo del día hacer:
   - 1 venta de membresía mensual
   - 1 venta de agua
   - 1 pago manual de inscripción
2. Al final del día, ir a Caja
3. Hacer corte de caja
4. Verificar que el total suma correctamente todas las transacciones

### Flujo E — Alumno inactivo

1. Crear alumno, asignar membresía
2. Esperar que pasen varios días sin check-in (o editar fecha en tu mente)
3. Ir a Reportes → Inactivos → filtro "14 días"
4. Debe aparecer el alumno
5. Clic en WhatsApp → abre chat con su número

### Flujo F — Congelar membresía por viaje

1. Alumno tiene membresía trimestral, le quedan 45 días
2. Se va de viaje 15 días → congelar
3. Intentar hacer check-in → debe denegarse (congelada)
4. Regresa → descongelar
5. Verificar que sigue teniendo 45 días de acceso (no 30)

---

# 🐛 BLOQUE 16 — Casos raros / errores

Prueba estos para asegurarnos que el sistema no se rompe:

- [ ] Quitar el internet en medio de una operación → debe mostrar error claro, no pantalla en blanco
- [ ] Recargar la página en medio de un modal abierto → no pierde datos guardados
- [ ] Abrir el sistema en 2 pestañas al mismo tiempo → ambas funcionan
- [ ] Hacer clic muy rápido en "Guardar" varias veces → no duplica registros
- [ ] Intentar entrar a una URL privada sin login (ej. `/students`) → te manda al login

---

# 📋 Checklist rápido para WhatsApp

Para que lleves cuenta mientras pruebas, copia esto y ve marcando:

```
BLOQUE 1 - Login: [ ]
BLOQUE 2 - Dashboard: [ ]
BLOQUE 3 - Alumnos: [ ]
BLOQUE 4 - Membresías: [ ]
BLOQUE 5 - Clases: [ ]
BLOQUE 6 - Reservaciones: [ ]
BLOQUE 7 - Check-in: [ ]
BLOQUE 8 - Instructores: [ ]
BLOQUE 9 - Caja: [ ]
BLOQUE 10 - Inventario: [ ]
BLOQUE 11 - Reportes: [ ]
BLOQUE 12 - Configuración: [ ]
BLOQUE 13 - Portal alumno: [ ]
BLOQUE 14 - Landings: [ ]
BLOQUE 15 - Flujos completos: [ ]
BLOQUE 16 - Casos raros: [ ]
```

---

# 📝 Cómo reportar problemas

Si algo no funciona, mándame un mensaje con este formato:

```
🐛 BUG
Bloque: [número y nombre]
Paso: [número]
Qué pasó: [describe brevemente]
Captura: [adjunta foto]
Navegador: [Chrome/Safari/etc]
Dispositivo: [PC/celular/tablet]
```

Ejemplo:
```
🐛 BUG
Bloque: 7 - Check-in
Paso: 7.6 QR celular
Qué pasó: Al escanear el QR no reconoce al alumno, se queda pensando
Captura: [foto.jpg]
Navegador: Chrome
Dispositivo: Laptop
```

---

# 🎯 Prioridades de prueba

Si no tienes tiempo de probar todo, al menos prueba esto en este orden:

1. **Crítico** — Login, Check-in, Crear alumno + membresía, Caja
2. **Importante** — Clases, Reservaciones, Portal del alumno, Inventario
3. **Bueno-tener** — Reportes, Configuración, Landings, casos raros

---

*Última actualización: 2026-04-26 · Versión del sistema: 1.5.6*

Cualquier duda, me avisas. ¡Éxito con las pruebas! 💪
