# Flujos de Operación — Gimnasio Híbrido

## Visión General

El sistema soporta un modelo **híbrido** donde los miembros pueden:
- Asistir presencialmente al gimnasio
- Tomar clases en línea (Zoom/Meet)
- Reservar equipos o espacios específicos

---

## 1. Flujo de Llegada Presencial

```
┌─────────────────┐
│   Miembro llega │
│   al gimnasio   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Escanea su QR   │────▶│ Sistema valida:  │
│ en la entrada   │     │ • Membresía activa│
└─────────────────┘     │ • No vencida     │
                        │ • Clases restantes│
                        └────────┬─────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
      ┌───────────┐      ┌───────────┐      ┌───────────┐
      │ ✅ Acceso │      │ ⚠️ Alerta │      │ ❌ Acceso │
      │ permitido │      │ vence en  │      │ denegado  │
      │           │      │ 3 días    │      │           │
      └───────────┘      └───────────┘      └───────────┘
              │                  │                  │
              ▼                  ▼                  ▼
      ┌───────────┐      ┌───────────┐      ┌───────────┐
      │ Registra  │      │ Ofrece    │      │ Redirige  │
      │ check-in  │      │ renovación│      │ a caja    │
      └───────────┘      └───────────┘      └───────────┘
```

### Acciones del Staff en Recepción
1. **Check-in rápido**: Escanear QR o buscar por nombre
2. **Ver estado**: Membresía, clases restantes, próxima clase
3. **Alertas visuales**: Colores claros (verde/amarillo/rojo)
4. **Acción rápida**: Renovar, cobrar clase suelta, registrar visita

---

## 2. Flujo de Reservación de Clase

```
┌─────────────────┐
│ Miembro abre    │
│ la app/web      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ve calendario   │
│ de clases       │
│ (día/semana)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Selecciona      │
│ clase deseada   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Sistema valida  │────▶│ • Lugares disp.  │
│                 │     │ • Membresía OK   │
│                 │     │ • No duplicado   │
└────────┬────────┘     └──────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌───────┐
│ ✅    │  │ ⏳    │
│Confirm│  │Lista  │
│       │  │espera │
└───────┘  └───────┘
```

### Notificaciones
- **24h antes**: Recordatorio de clase
- **Lista de espera**: Notifica si se libera lugar
- **Cancelación**: Mínimo 2h antes sin penalización

---

## 3. Flujo de Clase (Instructor)

```
┌─────────────────┐
│ Instructor      │
│ inicia sesión   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ve sus clases   │
│ del día         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Selecciona      │
│ clase actual    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│           DURANTE LA CLASE          │
├─────────────────────────────────────┤
│ • Lista de asistentes              │
│ • Marcar asistencia (tap rápido)   │
│ • Ver notas médicas de miembros    │
│ • Iniciar sesión virtual (Zoom)    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Al terminar:    │
│ • Confirmar     │
│   asistencias   │
│ • Notas de clase│
└─────────────────┘
```

---

## 4. Flujo de Administrador

### Dashboard Principal
```
┌─────────────────────────────────────────────────────┐
│                    DASHBOARD                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │ 👥 45   │  │ 📅 8    │  │ ⚠️ 12   │  │ 💰 $5k │ │
│  │ Activos │  │ Clases  │  │ Por     │  │ Hoy    │ │
│  │ hoy     │  │ hoy     │  │ vencer  │  │        │ │
│  └─────────┘  └─────────┘  └─────────┘  └────────┘ │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  ACCIONES RÁPIDAS                           │   │
│  ├─────────────────────────────────────────────┤   │
│  │  [+ Nuevo miembro]  [+ Nueva clase]         │   │
│  │  [📋 Check-in]      [💳 Cobrar]             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Flujo de Nuevo Miembro
1. **Datos básicos**: Nombre, email, teléfono
2. **Foto** (opcional): Para identificación
3. **Contacto emergencia**: Nombre y teléfono
4. **Notas médicas**: Condiciones, lesiones, restricciones
5. **Selección de membresía**: Tipo y pago
6. **Generación de QR**: Código único para check-in

---

## 5. Tipos de Membresía

| Tipo | Descripción | Acceso |
|------|-------------|--------|
| **Mensual** | Acceso ilimitado 30 días | Todas las clases |
| **Quincenal** | Acceso ilimitado 15 días | Todas las clases |
| **Paquete 8** | 8 clases para usar en 45 días | Solo clases grupales |
| **Paquete 12** | 12 clases para usar en 60 días | Solo clases grupales |
| **Día suelto** | 1 visita única | Solo ese día |
| **Fundador** | Membresía especial permanente | Acceso total + beneficios |

---

## 6. Roles del Sistema

### 👤 Miembro
- Ver su membresía y clases restantes
- Reservar/cancelar clases
- Ver historial de asistencias
- Actualizar datos de contacto

### 🏋️ Instructor
- Ver clases asignadas
- Tomar asistencia
- Ver información de miembros en su clase
- Reportar incidentes

### 📋 Recepcionista
- Check-in de miembros
- Registrar nuevos miembros
- Cobrar membresías y clases sueltas
- Ver calendario del día

### 👑 Administrador
- Todo lo anterior
- Gestionar instructores
- Reportes y métricas
- Configuración del sistema

---

## 7. Horario Típico de Gimnasio

```
LUNES - VIERNES
───────────────────────────────────────
06:00 │ Apertura
07:00 │ ████ Zumba (María)
08:00 │ ████ Yoga (Carlos)
09:00 │ ████ Spinning (Ana)
10:00 │ 
11:00 │ ████ Funcional (Pedro)
12:00 │ 
...
17:00 │ ████ CrossFit (Luis)
18:00 │ ████ Zumba (María)
19:00 │ ████ Boxing (Jorge)
20:00 │ ████ Yoga (Carlos)
21:00 │ Cierre
───────────────────────────────────────
```

---

## 8. Integraciones Futuras

- **WhatsApp**: Recordatorios y confirmaciones
- **Pagos en línea**: Stripe/MercadoPago
- **Zoom**: Clases virtuales automáticas
- **Control de acceso**: Torniquetes con QR
