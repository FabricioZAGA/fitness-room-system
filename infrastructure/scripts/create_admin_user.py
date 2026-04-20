#!/usr/bin/env python3
"""Create an admin user in Cognito and send a welcome email with credentials.

Usage:
    python create_admin_user.py --email user@example.com [--name "Full Name"]

Requires:
    - AWS_PROFILE=salle-cajas (or valid AWS credentials)
    - SES sender email must be verified in the target region
"""

import argparse
import json
import secrets
import string
import sys

import boto3
from botocore.exceptions import ClientError

# ── Configuration ────────────────────────────────────────────────────────────

AWS_REGION = "us-west-2"
USER_POOL_ID = "us-west-2_nErXzvgfc"
ADMIN_GROUP = "admin"
SENDER_EMAIL = "noreply@fitness-room.mx"
SENDER_NAME = "Fitness Room"
ADMIN_FRONTEND_URL = "https://d3awxegxyh5p20.cloudfront.net"


def generate_password(length: int = 14) -> str:
    """Generate a secure random password meeting Cognito requirements."""
    chars = string.ascii_letters + string.digits + "!@#$%&*"
    while True:
        pwd = "".join(secrets.choice(chars) for _ in range(length))
        has_upper = any(c.isupper() for c in pwd)
        has_lower = any(c.islower() for c in pwd)
        has_digit = any(c.isdigit() for c in pwd)
        has_special = any(c in "!@#$%&*" for c in pwd)
        if has_upper and has_lower and has_digit and has_special:
            return pwd


def create_cognito_user(
    cognito_client: boto3.client,
    email: str,
    name: str,
    password: str,
) -> dict:
    """Create a Cognito user and set their password."""
    try:
        response = cognito_client.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "name", "Value": name},
            ],
            MessageAction="SUPPRESS",
        )
        print(f"  ✅ User created: {email}")
    except ClientError as e:
        if e.response["Error"]["Code"] == "UsernameExistsException":
            print(f"  ⚠️  User {email} already exists — updating password")
            response = {"User": {"Username": email}}
        else:
            raise

    cognito_client.admin_set_user_password(
        UserPoolId=USER_POOL_ID,
        Username=email,
        Password=password,
        Permanent=True,
    )
    print(f"  ✅ Password set (permanent)")

    cognito_client.admin_add_user_to_group(
        UserPoolId=USER_POOL_ID,
        Username=email,
        GroupName=ADMIN_GROUP,
    )
    print(f"  ✅ Added to group: {ADMIN_GROUP}")

    return response


def send_welcome_email(
    ses_client: boto3.client,
    email: str,
    name: str,
    password: str,
) -> None:
    """Send welcome email with credentials via SES."""
    subject = "🏋️ Bienvenido a Fitness Room — Tus credenciales de acceso"

    html_body = f"""
    <html>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1);">

        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
          <h1 style="color: #d4af37; margin: 0; font-size: 28px;">Fitness Room</h1>
          <p style="color: #ffffff; margin: 8px 0 0; font-size: 14px; opacity: 0.8;">Panel de Administración</p>
        </div>

        <div style="padding: 30px;">
          <h2 style="color: #1a1a2e; margin: 0 0 20px;">¡Hola, {name}!</h2>

          <p style="color: #333; font-size: 15px; line-height: 1.6;">
            Tu cuenta de administrador ha sido creada exitosamente.
            A continuación encontrarás tus credenciales de acceso:
          </p>

          <div style="background: #f8f9fa; border-left: 4px solid #d4af37; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0 0 8px; color: #666; font-size: 13px;">ENLACE DE ACCESO</p>
            <p style="margin: 0 0 16px;">
              <a href="{ADMIN_FRONTEND_URL}" style="color: #d4af37; font-size: 15px; word-break: break-all;">{ADMIN_FRONTEND_URL}</a>
            </p>
            <p style="margin: 0 0 8px; color: #666; font-size: 13px;">CORREO ELECTRÓNICO</p>
            <p style="margin: 0 0 16px; font-size: 16px; font-weight: bold; color: #1a1a2e;">{email}</p>
            <p style="margin: 0 0 8px; color: #666; font-size: 13px;">CONTRASEÑA TEMPORAL</p>
            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1a1a2e; font-family: monospace; background: #fff; padding: 8px 12px; border-radius: 4px; border: 1px solid #e0e0e0;">{password}</p>
          </div>

          <div style="background: #fff3cd; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              ⚠️ <strong>Importante:</strong> Cambia tu contraseña después del primer inicio de sesión.
            </p>
          </div>

          <p style="color: #333; font-size: 15px; line-height: 1.6;">
            Si tienes alguna duda, no dudes en contactarnos.
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="margin: 0; color: #999; font-size: 12px;">
            © 2026 Fitness Room — Este correo fue enviado automáticamente
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    text_body = f"""Bienvenido a Fitness Room, {name}!

Tus credenciales de acceso:

  Enlace: {ADMIN_FRONTEND_URL}
  Email:  {email}
  Contraseña: {password}

Cambia tu contraseña después del primer inicio de sesión.
"""

    try:
        ses_client.send_email(
            Source=f"{SENDER_NAME} <{SENDER_EMAIL}>",
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Text": {"Data": text_body, "Charset": "UTF-8"},
                    "Html": {"Data": html_body, "Charset": "UTF-8"},
                },
            },
        )
        print(f"  ✅ Welcome email sent to {email}")
    except ClientError as e:
        code = e.response["Error"]["Code"]
        msg = e.response["Error"]["Message"]
        print(f"  ❌ Failed to send email: {code} — {msg}")
        print(f"     Credentials still valid. Share manually:")
        print(f"     Email: {email}")
        print(f"     Password: {password}")
        print(f"     URL: {ADMIN_FRONTEND_URL}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create admin user in Fitness Room")
    parser.add_argument("--email", required=True, help="User email address")
    parser.add_argument("--name", default="", help="User display name (defaults to email prefix)")
    parser.add_argument("--no-email", action="store_true", help="Skip sending welcome email")
    parser.add_argument("--profile", default="salle-cajas", help="AWS profile to use")
    args = parser.parse_args()

    name = args.name or args.email.split("@")[0].replace(".", " ").title()

    print(f"\n🏋️ Creating admin user for Fitness Room")
    print(f"  Email: {args.email}")
    print(f"  Name:  {name}")
    print(f"  Pool:  {USER_POOL_ID}")
    print()

    session = boto3.Session(profile_name=args.profile, region_name=AWS_REGION)
    cognito = session.client("cognito-idp")
    ses = session.client("ses")

    password = generate_password()
    create_cognito_user(cognito, args.email, name, password)

    if not args.no_email:
        print()
        send_welcome_email(ses, args.email, name, password)

    print(f"\n{'='*60}")
    print(f"  📋 Summary")
    print(f"  Email:    {args.email}")
    print(f"  Password: {password}")
    print(f"  Group:    {ADMIN_GROUP}")
    print(f"  URL:      {ADMIN_FRONTEND_URL}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
