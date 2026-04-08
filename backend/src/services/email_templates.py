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
                Este correo fue enviado por {gym_name}.<br>
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
