"""Cognito Custom Message Lambda Trigger.

Customizes email content based on user role (custom:role attribute).
- admin users get a link to admin.fitnessroom.mx
- student/teacher users get a link to portal.fitnessroom.mx
"""

import os

DOMAIN = os.environ.get("DOMAIN", "fitnessroom.mx")
ADMIN_URL = f"https://admin.{DOMAIN}"
PORTAL_URL = f"https://portal.{DOMAIN}"

BRAND_COLOR = "#d4af37"
BG_COLOR = "#0a0a0a"
CARD_BG = "#1a1a2e"
TEXT_COLOR = "#ffffff"
MUTED_COLOR = "#a0a0a0"


def _base_html(title: str, body: str) -> str:
    """Wrap body content in a branded HTML email template."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title}</title></head>
<body style="margin:0;padding:0;background-color:{BG_COLOR};font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:{BG_COLOR};padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:{CARD_BG};border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,{BRAND_COLOR},#f59e0b);padding:32px;text-align:center;">
<div style="width:48px;height:48px;background:rgba(0,0,0,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#000;line-height:48px;">FR</div>
<h1 style="color:#000;font-size:24px;margin:12px 0 0;">Fitness Room</h1>
</td></tr>
<tr><td style="padding:32px;">{body}</td></tr>
<tr><td style="padding:0 32px 24px;text-align:center;">
<p style="color:{MUTED_COLOR};font-size:12px;margin:0;">Fitness Room — fitnessroom.mx</p>
</td></tr>
</table>
</td></tr></table>
</body></html>"""


def _invite_html(username: str, password: str, app_url: str, app_name: str) -> str:
    """Generate branded invite email."""
    body = f"""
<h2 style="color:{TEXT_COLOR};font-size:20px;margin:0 0 16px;">Tu cuenta esta lista</h2>
<p style="color:{MUTED_COLOR};font-size:14px;line-height:1.6;">
Se ha creado una cuenta para ti en <strong style="color:{TEXT_COLOR};">Fitness Room — {app_name}</strong>.
Usa las siguientes credenciales para iniciar sesion:</p>
<div style="background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:20px;margin:20px 0;">
<p style="color:{MUTED_COLOR};font-size:13px;margin:0 0 8px;">Correo</p>
<p style="color:{TEXT_COLOR};font-size:16px;font-weight:bold;margin:0 0 16px;">{username}</p>
<p style="color:{MUTED_COLOR};font-size:13px;margin:0 0 8px;">Contrasena temporal</p>
<p style="color:{BRAND_COLOR};font-size:20px;font-weight:bold;margin:0;letter-spacing:2px;">{password}</p>
</div>
<p style="color:{MUTED_COLOR};font-size:13px;line-height:1.6;">
Al iniciar sesion por primera vez, se te pedira que cambies tu contrasena.</p>
<div style="text-align:center;margin:24px 0;">
<a href="{app_url}" style="display:inline-block;background:linear-gradient(135deg,{BRAND_COLOR},#f59e0b);color:#000;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:16px;">Iniciar Sesion</a>
</div>"""
    return _base_html("Tu cuenta esta lista — Fitness Room", body)


def _forgot_password_html(code: str, app_url: str) -> str:
    """Generate branded forgot-password email."""
    body = f"""
<h2 style="color:{TEXT_COLOR};font-size:20px;margin:0 0 16px;">Codigo de verificacion</h2>
<p style="color:{MUTED_COLOR};font-size:14px;line-height:1.6;">
Recibimos una solicitud para restablecer tu contrasena. Usa el siguiente codigo:</p>
<div style="text-align:center;margin:24px 0;">
<div style="display:inline-block;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:20px 40px;">
<p style="color:{BRAND_COLOR};font-size:36px;font-weight:bold;letter-spacing:8px;margin:0;">{code}</p>
</div></div>
<p style="color:{MUTED_COLOR};font-size:13px;line-height:1.6;">
Si no solicitaste este cambio, puedes ignorar este correo.</p>
<div style="text-align:center;margin:24px 0;">
<a href="{app_url}" style="display:inline-block;background:linear-gradient(135deg,{BRAND_COLOR},#f59e0b);color:#000;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:16px;">Ir a Fitness Room</a>
</div>"""
    return _base_html("Codigo de verificacion — Fitness Room", body)


def _get_app_info(user_attributes: dict) -> tuple[str, str]:
    """Determine the correct app URL and name based on user role."""
    role = user_attributes.get("custom:role", "student")
    if role == "admin":
        return ADMIN_URL, "Panel de Administracion"
    return PORTAL_URL, "Portal del Alumno"


def handler(event: dict, context: object) -> dict:
    """Cognito Custom Message trigger handler."""
    trigger = event.get("triggerSource", "")
    user_attrs = event.get("request", {}).get("userAttributes", {})
    app_url, app_name = _get_app_info(user_attrs)

    if trigger == "CustomMessage_AdminCreateUser":
        username = user_attrs.get("email", event.get("userName", ""))
        code = event["request"]["codeParameter"]
        event["response"]["emailSubject"] = "Tu cuenta en Fitness Room esta lista"
        event["response"]["emailMessage"] = _invite_html(
            username, code, app_url, app_name,
        )

    elif trigger in ("CustomMessage_ForgotPassword", "CustomMessage_ResendCode"):
        code = event["request"]["codeParameter"]
        event["response"]["emailSubject"] = "Codigo de verificacion — Fitness Room"
        event["response"]["emailMessage"] = _forgot_password_html(code, app_url)

    return event
