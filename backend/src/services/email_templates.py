"""HTML email templates for Fitness Room notification emails.

All templates use inline CSS for maximum email client compatibility.
Brand colors: black (#0a0a0a) + gold (#d4af37).
"""


def _base_layout(title: str, content: str, gym_name: str = "Fitness Room") -> str:
    """Wrap content in the shared email layout."""
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#d4af37 0%,#c49b28 100%);border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:800;color:#0a0a0a;letter-spacing:-0.5px;">{gym_name}</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#111111;border-radius:0 0 16px 16px;padding:40px;">
              {content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555555;">
                Este correo fue enviado por {gym_name} — <a href="https://portal.fitnessroom.mx" style="color:#d4af37;text-decoration:none;">portal.fitnessroom.mx</a><br>
                Si tienes dudas, contacta directamente al gimnasio.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def expiry_reminder_html(
    student_name: str,
    days_left: int,
    membership_type: str,
    end_date: str,
    gym_name: str = "Fitness Room",
    gym_phone: str = "",
) -> str:
    """Email template for membership expiry reminder."""
    is_critical = days_left <= 7
    badge_bg = "#3a1a1a" if is_critical else "#3a2e00"
    badge_color = "#ff6b6b" if is_critical else "#d4af37"
    badge_label = "¡Vence muy pronto!" if is_critical else "Próximo a vencer"
    urgency_msg = (
        f"Tu membresía vence <strong style='color:#ff6b6b;'>en {days_left} día{'s' if days_left != 1 else ''}</strong>."
        if is_critical
        else f"Tu membresía vence en <strong style='color:#d4af37;'>{days_left} días</strong>."
    )

    contact_block = (
        f'<p style="margin:8px 0 0;font-size:14px;color:#999999;">Llámanos: <strong style="color:#d4af37;">{gym_phone}</strong></p>'
        if gym_phone
        else ""
    )

    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#d4af37;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Recordatorio de Membresía
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        Hola, {student_name} 👋
      </h1>

      <div style="background-color:{badge_bg};border:1px solid {badge_color}30;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <span style="display:inline-block;background:{badge_color};color:#0a0a0a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 12px;border-radius:20px;margin-bottom:12px;">{badge_label}</span>
        <p style="margin:0;font-size:16px;color:#cccccc;line-height:1.6;">{urgency_msg}</p>
        <div style="margin-top:16px;display:flex;gap:20px;">
          <div>
            <p style="margin:0;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:0.5px;">Plan</p>
            <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#ffffff;">{membership_type}</p>
          </div>
          <div>
            <p style="margin:0;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:0.5px;">Fecha de vencimiento</p>
            <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#ffffff;">{end_date}</p>
          </div>
        </div>
      </div>

      <p style="margin:0 0 24px;font-size:15px;color:#aaaaaa;line-height:1.7;">
        Para renovar tu membresía y seguir entrenando sin interrupciones,
        visítanos en recepción o contáctanos directamente.
      </p>

      <div style="background-color:#1a1a1a;border-radius:12px;padding:20px 24px;">
        <p style="margin:0;font-size:14px;color:#888888;">¿Tienes preguntas?</p>
        <p style="margin:8px 0 0;font-size:14px;color:#cccccc;">Visítanos en recepción y con gusto te atendemos.</p>
        {contact_block}
      </div>
    """
    return _base_layout(
        title=f"Tu membresía vence en {days_left} días — {gym_name}",
        content=content,
        gym_name=gym_name,
    )


def inactivity_alert_html(
    student_name: str,
    inactive_days: int,
    gym_name: str = "Fitness Room",
    gym_phone: str = "",
) -> str:
    """Email template for inactivity reminder."""
    contact_block = (
        f'<p style="margin:8px 0 0;font-size:14px;color:#999999;">Llámanos: <strong style="color:#d4af37;">{gym_phone}</strong></p>'
        if gym_phone
        else ""
    )

    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#d4af37;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Te extrañamos
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {student_name}, ¡hace tiempo que no te vemos! 🏋️
      </h1>

      <div style="background-color:#1a1500;border:1px solid #d4af3730;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#cccccc;line-height:1.6;">
          Han pasado <strong style="color:#d4af37;">{inactive_days} días</strong> desde tu última visita a {gym_name}.
          ¡Tu progreso te espera!
        </p>
      </div>

      <p style="margin:0 0 20px;font-size:15px;color:#aaaaaa;line-height:1.7;">
        Sabemos que la vida puede ocuparse, pero recuerda que cada sesión
        cuenta. ¿Qué te parece agendar tu próxima visita hoy?
      </p>

      <ul style="margin:0 0 24px;padding-left:20px;color:#aaaaaa;font-size:15px;line-height:2;">
        <li>Tu membresía sigue activa ✅</li>
        <li>Tus instructores te esperan 💪</li>
        <li>Tu lugar en las clases está disponible 📅</li>
      </ul>

      <div style="background-color:#1a1a1a;border-radius:12px;padding:20px 24px;">
        <p style="margin:0;font-size:14px;color:#888888;">¿Necesitas reagendar o tienes alguna duda?</p>
        <p style="margin:8px 0 0;font-size:14px;color:#cccccc;">Estamos aquí para apoyarte en tu camino fitness.</p>
        {contact_block}
      </div>
    """
    return _base_layout(
        title=f"¡Te extrañamos en {gym_name}!",
        content=content,
        gym_name=gym_name,
    )


def custom_notification_html(
    student_name: str,
    message: str,
    gym_name: str = "Fitness Room",
) -> str:
    """Generic custom message email template."""
    content = f"""
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        Hola, {student_name} 👋
      </h1>

      <div style="background-color:#1a1a1a;border-radius:12px;padding:24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#cccccc;line-height:1.7;white-space:pre-wrap;">{message}</p>
      </div>

      <p style="margin:0;font-size:14px;color:#666666;">
        — El equipo de {gym_name}
      </p>
    """
    return _base_layout(title=f"Mensaje de {gym_name}", content=content, gym_name=gym_name)


def low_stock_alert_html(
    product_name: str,
    current_stock: int,
    threshold: int,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template for low stock alert to admin."""
    is_critical = current_stock == 0
    badge_bg = "#3a1a1a" if is_critical else "#3a2e00"
    badge_color = "#ff6b6b" if is_critical else "#d4af37"
    badge_label = "¡SIN STOCK!" if is_critical else "STOCK BAJO"

    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#d4af37;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Alerta de Inventario
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {product_name} necesita reabastecimiento 📦
      </h1>

      <div style="background-color:{badge_bg};border:1px solid {badge_color}30;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <span style="display:inline-block;background:{badge_color};color:#0a0a0a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 12px;border-radius:20px;margin-bottom:12px;">{badge_label}</span>
        <p style="margin:0;font-size:16px;color:#cccccc;line-height:1.6;">
          El producto <strong style="color:#ffffff;">{product_name}</strong> tiene
          <strong style="color:{badge_color};">{current_stock} unidad{'es' if current_stock != 1 else ''}</strong> disponible{'s' if current_stock != 1 else ''}.
        </p>
        <div style="margin-top:16px;">
          <p style="margin:0;font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:0.5px;">Umbral mínimo</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#ffffff;">{threshold} unidad{'es' if threshold != 1 else ''}</p>
        </div>
      </div>

      <p style="margin:0 0 24px;font-size:15px;color:#aaaaaa;line-height:1.7;">
        Por favor reabastece este producto lo antes posible para evitar
        interrupciones en las ventas.
      </p>

      <div style="background-color:#1a1a1a;border-radius:12px;padding:20px 24px;">
        <p style="margin:0;font-size:14px;color:#888888;">Acción recomendada:</p>
        <p style="margin:8px 0 0;font-size:14px;color:#cccccc;">
          Ingresa al panel de administración y registra el reabastecimiento del producto.
        </p>
      </div>
    """
    return _base_layout(
        title=f"Alerta: {product_name} — {gym_name}",
        content=content,
        gym_name=gym_name,
    )


# ─── Student event templates ────────────────────────────────────────────────


def reservation_confirmed_html(
    student_name: str,
    class_type: str,
    class_date: str,
    start_time: str,
    instructor_name: str,
    location: str,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: reservation confirmed for student."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#d4af37;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Reservación Confirmada
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        ¡Listo, {student_name}! Tu lugar está reservado ✅
      </h1>
      <div style="background-color:#0d1f0d;border:1px solid #22c55e30;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <div style="margin-bottom:12px;">
          <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Clase</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#ffffff;">{class_type}</p>
        </div>
        <div style="display:flex;gap:24px;">
          <div>
            <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Fecha</p>
            <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#ffffff;">{class_date}</p>
          </div>
          <div>
            <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Hora</p>
            <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#ffffff;">{start_time}</p>
          </div>
        </div>
        <div style="margin-top:12px;">
          <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Instructor</p>
          <p style="margin:4px 0 0;font-size:15px;color:#ffffff;">{instructor_name}</p>
        </div>
        <div style="margin-top:12px;">
          <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Ubicación</p>
          <p style="margin:4px 0 0;font-size:15px;color:#ffffff;">{location}</p>
        </div>
      </div>
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">
        Recuerda que puedes cancelar hasta 2 horas antes del inicio de la clase.
      </p>
    """
    return _base_layout(title=f"Reservación confirmada — {gym_name}", content=content, gym_name=gym_name)


def reservation_cancelled_html(
    student_name: str,
    class_type: str,
    class_date: str,
    start_time: str,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: reservation cancelled for student."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#ef4444;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Reservación Cancelada
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {student_name}, tu reservación fue cancelada
      </h1>
      <div style="background-color:#1f0d0d;border:1px solid #ef444430;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#ccc;line-height:1.6;">
          Tu lugar en <strong style="color:#fff;">{class_type}</strong> del
          <strong style="color:#fff;">{class_date}</strong> a las
          <strong style="color:#fff;">{start_time}</strong> ha sido liberado.
        </p>
      </div>
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">
        Puedes inscribirte en otra clase desde tu portal.
      </p>
    """
    return _base_layout(title=f"Reservación cancelada — {gym_name}", content=content, gym_name=gym_name)


def waitlist_joined_html(
    student_name: str,
    class_type: str,
    class_date: str,
    start_time: str,
    position: int,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: student joined waitlist."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#f59e0b;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Lista de Espera
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {student_name}, estás en la lista de espera ⏳
      </h1>
      <div style="background-color:#1f1a00;border:1px solid #f59e0b30;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#ccc;line-height:1.6;">
          Tu posición para <strong style="color:#fff;">{class_type}</strong> del
          {class_date} a las {start_time}:
        </p>
        <p style="margin:12px 0 0;font-size:36px;font-weight:800;color:#f59e0b;">#{position}</p>
      </div>
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">
        Si alguien cancela, serás promovido automáticamente y recibirás una notificación.
      </p>
    """
    return _base_layout(title=f"Lista de espera — {gym_name}", content=content, gym_name=gym_name)


def waitlist_promoted_html(
    student_name: str,
    class_type: str,
    class_date: str,
    start_time: str,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: student promoted from waitlist to confirmed."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#22c55e;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        ¡Se liberó un lugar!
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {student_name}, ¡tu lugar está confirmado! 🎉
      </h1>
      <div style="background-color:#0d1f0d;border:1px solid #22c55e30;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#ccc;line-height:1.6;">
          Alguien canceló y tu reservación para <strong style="color:#fff;">{class_type}</strong> del
          <strong style="color:#fff;">{class_date}</strong> a las <strong style="color:#fff;">{start_time}</strong>
          ahora está <strong style="color:#22c55e;">confirmada</strong>.
        </p>
      </div>
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">
        ¡No faltes! Recuerda llegar 5 minutos antes.
      </p>
    """
    return _base_layout(title=f"¡Lugar confirmado! — {gym_name}", content=content, gym_name=gym_name)


def class_cancelled_html(
    student_name: str,
    class_type: str,
    class_date: str,
    start_time: str,
    instructor_name: str,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: class cancelled notification to student."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#ef4444;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Clase Cancelada
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {student_name}, una clase fue cancelada
      </h1>
      <div style="background-color:#1f0d0d;border:1px solid #ef444430;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#ccc;line-height:1.6;">
          La clase de <strong style="color:#fff;">{class_type}</strong> con
          <strong style="color:#fff;">{instructor_name}</strong> del
          <strong style="color:#fff;">{class_date}</strong> a las <strong style="color:#fff;">{start_time}</strong>
          ha sido cancelada.
        </p>
      </div>
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">
        Tu reservación fue liberada automáticamente. Puedes inscribirte en otra clase desde tu portal.
      </p>
    """
    return _base_layout(title=f"Clase cancelada — {gym_name}", content=content, gym_name=gym_name)


def class_reminder_html(
    student_name: str,
    class_type: str,
    class_date: str,
    start_time: str,
    instructor_name: str,
    location: str,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: class reminder (e.g. 1 hour before)."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#d4af37;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Recordatorio
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {student_name}, tu clase empieza pronto 🏋️
      </h1>
      <div style="background-color:#1a1500;border:1px solid #d4af3730;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#d4af37;">{class_type}</p>
        <p style="margin:8px 0 0;font-size:15px;color:#ccc;">
          Hoy a las <strong style="color:#fff;">{start_time}</strong> · {instructor_name} · {location}
        </p>
      </div>
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">
        ¡Te esperamos! Recuerda llevar tu toalla y agua.
      </p>
    """
    return _base_layout(title=f"Tu clase empieza pronto — {gym_name}", content=content, gym_name=gym_name)


def membership_created_html(
    student_name: str,
    membership_type: str,
    start_date: str,
    end_date: str,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: new membership created."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#d4af37;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        ¡Bienvenido!
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {student_name}, tu membresía está activa 🎉
      </h1>
      <div style="background-color:#0d1f0d;border:1px solid #22c55e30;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <div style="display:flex;gap:24px;">
          <div>
            <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;">Plan</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#fff;">{membership_type}</p>
          </div>
          <div>
            <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;">Vigencia</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#fff;">{start_date} — {end_date}</p>
          </div>
        </div>
      </div>
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">
        Ya puedes inscribirte en clases desde el portal. ¡A entrenar!
      </p>
    """
    return _base_layout(title=f"Membresía activada — {gym_name}", content=content, gym_name=gym_name)


def membership_frozen_html(
    student_name: str,
    freeze_days: int,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: membership frozen."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#3b82f6;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Membresía Congelada
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {student_name}, tu membresía está congelada ❄️
      </h1>
      <div style="background-color:#0d1520;border:1px solid #3b82f630;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#ccc;line-height:1.6;">
          Tu membresía se congeló por <strong style="color:#3b82f6;">{freeze_days} días</strong>.
          La fecha de vencimiento se extenderá automáticamente.
        </p>
      </div>
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">
        Cuando estés listo para regresar, contacta a recepción para descongelarla.
      </p>
    """
    return _base_layout(title=f"Membresía congelada — {gym_name}", content=content, gym_name=gym_name)


def membership_unfrozen_html(
    student_name: str,
    new_end_date: str,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: membership unfrozen."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#22c55e;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Membresía Reactivada
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {student_name}, ¡tu membresía está activa de nuevo! 💪
      </h1>
      <div style="background-color:#0d1f0d;border:1px solid #22c55e30;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#ccc;line-height:1.6;">
          Tu nueva fecha de vencimiento es: <strong style="color:#22c55e;">{new_end_date}</strong>
        </p>
      </div>
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">
        ¡Te esperamos de vuelta en el gimnasio!
      </p>
    """
    return _base_layout(title=f"Membresía reactivada — {gym_name}", content=content, gym_name=gym_name)


# ─── Instructor event templates ─────────────────────────────────────────────


def instructor_student_enrolled_html(
    instructor_name: str,
    student_name: str,
    class_type: str,
    class_date: str,
    start_time: str,
    reservations_count: int,
    capacity: int,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: notify instructor that a student enrolled in their class."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#d4af37;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Nueva Inscripción
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {instructor_name}, un alumno se inscribió a tu clase
      </h1>
      <div style="background-color:#0d1f0d;border:1px solid #22c55e30;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#ccc;line-height:1.6;">
          <strong style="color:#fff;">{student_name}</strong> se inscribió en
          <strong style="color:#fff;">{class_type}</strong> del {class_date} a las {start_time}.
        </p>
        <p style="margin:12px 0 0;font-size:14px;color:#888;">
          Ocupación: <strong style="color:#d4af37;">{reservations_count}/{capacity}</strong>
        </p>
      </div>
    """
    return _base_layout(title=f"Nueva inscripción — {gym_name}", content=content, gym_name=gym_name)


def instructor_student_cancelled_html(
    instructor_name: str,
    student_name: str,
    class_type: str,
    class_date: str,
    start_time: str,
    reservations_count: int,
    capacity: int,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: notify instructor that a student cancelled."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#ef4444;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Cancelación de Alumno
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {instructor_name}, un alumno canceló su asistencia
      </h1>
      <div style="background-color:#1f0d0d;border:1px solid #ef444430;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#ccc;line-height:1.6;">
          <strong style="color:#fff;">{student_name}</strong> canceló su lugar en
          <strong style="color:#fff;">{class_type}</strong> del {class_date} a las {start_time}.
        </p>
        <p style="margin:12px 0 0;font-size:14px;color:#888;">
          Ocupación actual: <strong style="color:#f59e0b;">{reservations_count}/{capacity}</strong>
        </p>
      </div>
    """
    return _base_layout(title=f"Cancelación de alumno — {gym_name}", content=content, gym_name=gym_name)


def instructor_class_full_html(
    instructor_name: str,
    class_type: str,
    class_date: str,
    start_time: str,
    capacity: int,
    waitlist_count: int,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: notify instructor their class is now full."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#22c55e;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        ¡Clase Llena!
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {instructor_name}, ¡tu clase está llena! 🔥
      </h1>
      <div style="background-color:#0d1f0d;border:1px solid #22c55e30;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#ccc;line-height:1.6;">
          <strong style="color:#fff;">{class_type}</strong> del {class_date} a las {start_time}
          tiene <strong style="color:#22c55e;">{capacity}/{capacity}</strong> lugares ocupados.
        </p>
        {f'<p style="margin:8px 0 0;font-size:14px;color:#f59e0b;">{waitlist_count} persona(s) en lista de espera</p>' if waitlist_count > 0 else ''}
      </div>
    """
    return _base_layout(title=f"¡Clase llena! — {gym_name}", content=content, gym_name=gym_name)


def instructor_class_assigned_html(
    instructor_name: str,
    class_type: str,
    class_date: str,
    start_time: str,
    duration_minutes: int,
    location: str,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: instructor assigned to a new class."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#d4af37;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Nueva Clase Asignada
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {instructor_name}, se te asignó una nueva clase 📋
      </h1>
      <div style="background-color:#1a1500;border:1px solid #d4af3730;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#d4af37;">{class_type}</p>
        <p style="margin:8px 0 0;font-size:15px;color:#ccc;">
          {class_date} · {start_time} · {duration_minutes} min · {location}
        </p>
      </div>
    """
    return _base_layout(title=f"Clase asignada — {gym_name}", content=content, gym_name=gym_name)


def instructor_class_cancelled_html(
    instructor_name: str,
    class_type: str,
    class_date: str,
    start_time: str,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: instructor's class was cancelled by admin."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#ef4444;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Clase Cancelada
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {instructor_name}, una de tus clases fue cancelada
      </h1>
      <div style="background-color:#1f0d0d;border:1px solid #ef444430;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#ccc;line-height:1.6;">
          La clase de <strong style="color:#fff;">{class_type}</strong> del
          {class_date} a las {start_time} ha sido cancelada por la administración.
        </p>
      </div>
    """
    return _base_layout(title=f"Clase cancelada — {gym_name}", content=content, gym_name=gym_name)


# ─── Admin event templates ──────────────────────────────────────────────────


def admin_new_student_html(
    student_name: str,
    student_email: str,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: new student registered (admin notification)."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#d4af37;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Nuevo Alumno
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        Se registró un nuevo alumno 📝
      </h1>
      <div style="background-color:#1a1500;border:1px solid #d4af3730;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <div>
          <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;">Nombre</p>
          <p style="margin:4px 0 12px;font-size:16px;font-weight:600;color:#fff;">{student_name}</p>
        </div>
        <div>
          <p style="margin:0;font-size:11px;color:#888;text-transform:uppercase;">Email</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#fff;">{student_email}</p>
        </div>
      </div>
    """
    return _base_layout(title=f"Nuevo alumno — {gym_name}", content=content, gym_name=gym_name)


def admin_membership_expired_html(
    student_name: str,
    membership_type: str,
    expired_date: str,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: membership expired (admin notification)."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#ef4444;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Membresía Expirada
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        Membresía vencida — acción requerida
      </h1>
      <div style="background-color:#1f0d0d;border:1px solid #ef444430;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#ccc;line-height:1.6;">
          La membresía de <strong style="color:#fff;">{student_name}</strong>
          ({membership_type}) venció el <strong style="color:#ef4444;">{expired_date}</strong>.
        </p>
      </div>
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">
        Contacta al alumno para ofrecerle renovación.
      </p>
    """
    return _base_layout(title=f"Membresía expirada — {gym_name}", content=content, gym_name=gym_name)


# ─── Student welcome / carta responsiva ─────────────────────────────────────


def welcome_carta_responsiva_html(
    student_name: str,
    gym_name: str = "Fitness Room",
) -> str:
    """Email template: welcome email with carta responsiva PDF attached."""
    content = f"""
      <p style="margin:0 0 8px;font-size:13px;color:#d4af37;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        ¡Bienvenido a {gym_name}!
      </p>
      <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
        {student_name}, tu registro está completo 🎉
      </h1>
      <div style="background-color:#0d1f0d;border:1px solid #22c55e30;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:16px;color:#ccc;line-height:1.6;">
          Adjunto a este correo encontrarás tu <strong style="color:#fff;">Carta Responsiva</strong>
          firmada digitalmente con tus datos. Este documento forma parte de tu expediente
          como miembro de <strong style="color:#d4af37;">{gym_name}</strong>.
        </p>
      </div>
      <div style="background-color:#1a150030;border:1px solid #d4af3730;border-radius:12px;padding:16px 24px;margin-bottom:28px;">
        <p style="margin:0;font-size:14px;color:#d4af37;font-weight:600;">📄 Documento adjunto:</p>
        <p style="margin:6px 0 0;font-size:14px;color:#ccc;">
          Carta_Responsiva_{student_name.replace(' ', '_')}.pdf
        </p>
      </div>
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">
        Te recomendamos guardar este documento para tu registro personal.
        Si tienes alguna duda, no dudes en contactarnos.
      </p>
      <p style="margin:16px 0 0;font-size:14px;color:#aaa;line-height:1.7;">
        ¡Te esperamos en el gimnasio! 💪
      </p>
    """
    return _base_layout(title=f"¡Bienvenido! — {gym_name}", content=content, gym_name=gym_name)
