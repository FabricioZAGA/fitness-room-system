# Flujos Operativos — Fitness Room System

> **Estado:** Fases 1–2.5 completadas. Todos los flujos descritos en este documento están implementados y operativos.

---

## Contexto del Negocio (México)

**Fitness Room** es un estudio de fitness en México con:
- Un recepcionista en turno que opera el sistema
- Instructores que imparten clases grupales
- Miembros con distintos tipos de membresía (mensual, packs, etc.)
- Pago típico en efectivo o transferencia (MXN)
- Comunicación con miembros principalmente por WhatsApp (Fase 2)

**Operaciones por frecuencia:**
- **Diario (múltiples veces):** Check-in de miembros
- **Semanal:** Registro de nuevos miembros, asignación de membresías
- **Mensual:** Programación de clases, renovaciones
- **Esporádico:** Gestión de instructores, configuración

---

## 1. Flujo de Check-in (Operación Principal)

Este es el flujo más crítico. Ocurre cada vez que llega un miembro al gimnasio.

```
Miembro llega al gimnasio
         │
         ▼
Recepcionista abre /checkin
         │
         ▼
Escribe 2+ letras del nombre
         │
         ▼  (búsqueda client-side, < 100ms)
Lista de hasta 10 resultados
         │
         ▼
Click en el miembro correcto
         │
         ▼
Sistema valida (POST /checkin en background):
  1. Student.status == active | founder
  2. Membresía activa existe
  3. days_until_expiry > 0
         │
    ┌────┼────────────────┐
    ▼    ▼                ▼
  ✅    ⚠️ (<7 días)     ❌
  Verde  Ámbar            Rojo
    │    │                │
    └────┴──── Click "Registrar Check-in"
                         │
                         ▼
               CHECKIN#{timestamp} guardado en DynamoDB
```

**Reglas de acceso:**
- `active` o `founder` → puede intentar
- Sin membresía → `NO_MEMBERSHIP` → denegado
- Membresía expirada (`days_until_expiry <= 0`) → `EXPIRED` → denegado
- `days_until_expiry in [1..7]` → `EXPIRING_SOON` → permitido con alerta
- `days_until_expiry >= 8` → `ALL_GOOD` → permitido

---

## 2. Flujo de Nuevo Miembro

```
Staff hace click en "Nuevo Miembro" (Dashboard o /students)
         │
         ▼
Modal: CreateStudentModal
  • Nombre y apellido (requerido)
  • Correo electrónico (requerido, único)
  • Teléfono (opcional)
  • Estado inicial: "Nuevo" (default)
  • Notas (opcional)
         │
         ▼
POST /api/v1/students
         │
         ▼
✅ Alumno registrado
         │
         ▼
[RECOMENDADO] Ir a perfil del alumno → asignar membresía inmediatamente
```

**Nota:** El estado "Nuevo" no permite check-in. Cambiar a "Activo" o asignar membresía activa.

---

## 3. Flujo de Asignación de Membresía

```
Desde: perfil del alumno | módulo /memberships | dashboard "Nuevo Miembro"
         │
         ▼
Modal: CreateMembershipModal
  • Si viene de perfil de alumno: alumno pre-seleccionado
  • Tipo de membresía (seleccionar)
  • Fecha inicio (default: hoy)
  • Fecha fin: calculada automáticamente según el tipo
  • Precio pagado en MXN
  • Para packs: total de clases pre-llenado
         │
         ▼
POST /api/v1/memberships
         │
         ▼
✅ Membresía activa. El alumno ya puede hacer check-in.
```

**Cálculo de fechas automáticas:**
- `monthly` → +1 mes desde fecha inicio
- `quarterly` → +3 meses
- `semi_annual` → +6 meses
- `annual` → +12 meses
- `day_pass` → mismo día que inicio
- Packs → sin fecha fin fija (solo clases restantes)

---

## 4. Flujo de Clase Grupal

### Crear clase

```
Staff hace click en "Nueva Clase" (/classes)
         │
         ▼
Modal: CreateClassModal
  • Tipo de clase (Zumba, Pilates, Yoga, etc.)
  • Instructor (selección de lista de activos)
  • Fecha y hora de inicio
  • Duración en minutos
  • Capacidad máxima
  • Ubicación (Sala A, B, etc.)
  • Link de clase online (opcional)
         │
         ▼
POST /api/v1/classes
✅ Clase aparece en calendario
```

### Agregar miembro a clase

```
Vista Calendario → click en clase → panel lateral
  → botón "Añadir Miembro"
         │
         ▼
Modal: AddToClassModal
  • Buscar alumno por nombre
  • Select del alumno
         │
         ▼
POST /api/v1/reservations
  • Si hay lugares: status = "confirmed"
  • Si clase llena: status = "waitlisted"
```

### Marcar asistencia

```
POST /api/v1/reservations/{id}/attend
  attended=true  → status = "attended", decrementa classes_remaining si es pack
  attended=false → status = "no_show"
```

---

## 5. Flujo de Alerta de Vencimiento

```
Dashboard carga (GET /api/v1/stats)
         │
         ▼
Si expiring_memberships_7d > 0:
  → Alerta naranja en dashboard
  → Link directo a /memberships
         │
         ▼
En /memberships:
  Sección "Urgente" (≤7 días): borde rojo
  Sección "Próximamente" (8-30 días): borde ámbar
         │
         ▼
Botón "Renovar" en cada tarjeta
  → Abre CreateMembershipModal con alumno pre-seleccionado
  → Staff asigna nueva membresía con pago en MXN
```

---

## 6. Tipos de Membresía Implementados

| Tipo | Clave API | Duración | Clases |
|------|-----------|----------|--------|
| Mensual | `monthly` | 30 días | Sin límite |
| Trimestral | `quarterly` | 90 días | Sin límite |
| Semestral | `semi_annual` | 180 días | Sin límite |
| Anual | `annual` | 365 días | Sin límite |
| Pack 5 | `class_pack_5` | Sin fecha | 5 clases |
| Pack 10 | `class_pack_10` | Sin fecha | 10 clases |
| Pack 20 | `class_pack_20` | Sin fecha | 20 clases |
| Día suelto | `day_pass` | 1 día | Sin límite |

---

## 7. Estados de Alumno

| Estado | Clave | Check-in permitido | Descripción |
|--------|-------|--------------------|-------------|
| Nuevo | `new` | No | Recién registrado, sin membresía activa |
| Activo | `active` | Sí (con membresía) | Miembro regular |
| Fundador | `founder` | Sí (con membresía) | Miembro fundador, mismo acceso que activo |
| Inactivo | `inactive` | No | Dado de baja temporalmente |

---

## 8. Clases Disponibles

Zumba, Pilates, Yoga, Spinning, Cross Training, Entrenamiento Funcional,
Body Combat, Danza, Stretching, Clase General.

---

## 9. Flujos Fase 2 — Implementados

### Caja / Corte de caja

```
Día de operación
         │
         ▼
Cada pago de membresía/producto crea Transaction automáticamente
         │
         ▼
Staff abre /caja → ve resumen del día (Efectivo / Tarjeta / Transferencia)
         │
         ▼
Al cierre → clic "Corte de Caja" → confirma → CashCut guardado en DynamoDB
```

### Inventario / Ventas

```
Staff abre /inventario
         │
         ▼
Busca producto → clic "Vender" → indica cantidad y método de pago
         │
         ▼
POST /api/v1/inventory/products/{id}/sell
  → decrementa stock
  → crea Transaction en Caja automáticamente
  → si stock <= umbral → activa alerta de stock bajo
```

### Notificaciones Email (SES)

```
EventBridge (diario) → Lambda handler
         │
         ▼
Consulta membresías con days_until_expiry in [1..7]
         │
         ▼
SES envía email al alumno: "Tu membresía vence en X días"
```

### QR Check-in (Fase 2.5)

```
Alumno abre portal (/portal/qr) → muestra código QR personal
         │
         ▼
Staff escanea QR con cámara → extrae student_id
         │
         ▼
Sistema busca alumno automáticamente en /checkin → mismo flujo de validación
```

## 10. Flujos Fase 3 (Planeados — no implementados)

- **WhatsApp:** Recordatorio 7 días antes del vencimiento via WhatsApp Business API (Meta)
- **Corte de caja avanzado:** Cuadre por cajero, diferencias de caja, reportes por turno

---

*Última actualización: 2026-04-20 — Fases 1–2.5 completas*
