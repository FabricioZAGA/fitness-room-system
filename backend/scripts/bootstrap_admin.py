"""Bootstrap admin user — run this when the Cognito pool has no users.

Usage:
    cd backend
    uv run python scripts/bootstrap_admin.py --email devzaga@gmail.com --name "Fabricio Zacarias"

This script bypasses the HTTP API (which requires an auth token) and calls
Cognito + SES directly via boto3.  Safe to run multiple times — it handles
UsernameExistsException gracefully by resetting the password.
"""

import argparse
import secrets
import string
import sys

import boto3
from botocore.exceptions import ClientError

# ── Config — edit these or pass via env vars ──────────────────────────────────
USER_POOL_ID = "us-west-2_nErXzvgfc"
AWS_PROFILE = "salle-cajas"
AWS_REGION = "us-west-2"
SES_SENDER = "noreply@fitnessroom.mx"
ADMIN_URL = "https://admin.fitnessroom.mx"
BRAND_COLOR = "#d4af37"
BG = "#0a0a0a"
CARD_BG = "#1a1a2e"


def generate_password(length: int = 14) -> str:
    chars = string.ascii_letters + string.digits + "!@#$%&*"
    while True:
        pwd = "".join(secrets.choice(chars) for _ in range(length))
        if (
            any(c.isupper() for c in pwd)
            and any(c.islower() for c in pwd)
            and any(c.isdigit() for c in pwd)
            and any(c in "!@#$%&*" for c in pwd)
        ):
            return pwd


def credentials_html(name: str, email: str, password: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:{BG};font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:{BG};padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
       style="background:{CARD_BG};border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,{BRAND_COLOR},#f59e0b);padding:32px;text-align:center;">
  <div style="width:48px;height:48px;background:rgba(0,0,0,0.2);border-radius:12px;
              display:inline-flex;align-items:center;justify-content:center;
              font-size:20px;font-weight:bold;color:#000;line-height:48px;">FR</div>
  <h1 style="color:#000;font-size:24px;margin:12px 0 0;">Fitness Room</h1>
</td></tr>
<tr><td style="padding:32px;">
  <h2 style="color:#fff;font-size:20px;margin:0 0 16px;">Hola {name}, tu cuenta admin esta lista</h2>
  <p style="color:#a0a0a0;font-size:14px;line-height:1.6;">
    Usa estas credenciales para acceder al panel de administracion:</p>
  <div style="background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);
              border-radius:12px;padding:20px;margin:20px 0;">
    <p style="color:#a0a0a0;font-size:13px;margin:0 0 8px;">Correo</p>
    <p style="color:#fff;font-size:16px;font-weight:bold;margin:0 0 16px;">{email}</p>
    <p style="color:#a0a0a0;font-size:13px;margin:0 0 8px;">Contrasena temporal</p>
    <p style="color:{BRAND_COLOR};font-size:22px;font-weight:bold;
              margin:0;letter-spacing:2px;">{password}</p>
  </div>
  <p style="color:#a0a0a0;font-size:13px;line-height:1.6;">
    Se te pedira que cambies tu contrasena al iniciar sesion por primera vez.</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="{ADMIN_URL}"
       style="display:inline-block;background:linear-gradient(135deg,{BRAND_COLOR},#f59e0b);
              color:#000;text-decoration:none;padding:14px 32px;border-radius:12px;
              font-weight:bold;font-size:16px;">Ir al Panel Admin</a>
  </div>
</td></tr>
<tr><td style="padding:0 32px 24px;text-align:center;">
  <p style="color:#a0a0a0;font-size:12px;margin:0;">Fitness Room — fitnessroom.mx</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap first admin user")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--name", required=True, help="Admin display name")
    parser.add_argument(
        "--password",
        default=None,
        help="Password (generated if omitted)",
    )
    args = parser.parse_args()

    session = boto3.Session(profile_name=AWS_PROFILE, region_name=AWS_REGION)
    cognito = session.client("cognito-idp")
    ses = session.client("ses")

    password = args.password or generate_password()

    # 1. Create or update the user
    try:
        cognito.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=args.email,
            UserAttributes=[
                {"Name": "email", "Value": args.email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "name", "Value": args.name},
            ],
            MessageAction="SUPPRESS",
        )
        print(f"✓ User created: {args.email}")
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "UsernameExistsException":
            print(f"  User already exists — resetting password for {args.email}")
        else:
            print(f"✗ Cognito error: {exc}", file=sys.stderr)
            sys.exit(1)

    # 2. Set password as temporary (forces change on first login)
    cognito.admin_set_user_password(
        UserPoolId=USER_POOL_ID,
        Username=args.email,
        Password=password,
        Permanent=False,
    )
    print(f"✓ Temporary password set")

    # 3. Add to admin group
    cognito.admin_add_user_to_group(
        UserPoolId=USER_POOL_ID,
        Username=args.email,
        GroupName="admin",
    )
    print(f"✓ Added to admin group")

    # 4. Send credentials email via SES
    try:
        ses.send_email(
            Source=f"Fitness Room <{SES_SENDER}>",
            Destination={"ToAddresses": [args.email]},
            Message={
                "Subject": {"Data": "Tu cuenta admin — Fitness Room", "Charset": "UTF-8"},
                "Body": {
                    "Html": {
                        "Data": credentials_html(args.name, args.email, password),
                        "Charset": "UTF-8",
                    },
                    "Text": {
                        "Data": (
                            f"Hola {args.name},\n\n"
                            f"Tu cuenta admin en Fitness Room:\n"
                            f"Email: {args.email}\n"
                            f"Contraseña temporal: {password}\n\n"
                            f"Panel: {ADMIN_URL}\n"
                        ),
                        "Charset": "UTF-8",
                    },
                },
            },
        )
        print(f"✓ Credentials email sent to {args.email}")
    except ClientError as exc:
        print(f"⚠ Email failed (user still created): {exc}", file=sys.stderr)

    print()
    print("=" * 50)
    print(f"  Email:    {args.email}")
    print(f"  Password: {password}  (temporary — must change on first login)")
    print(f"  URL:      {ADMIN_URL}")
    print("=" * 50)


if __name__ == "__main__":
    main()
