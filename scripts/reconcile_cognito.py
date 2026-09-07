#!/usr/bin/env python3
"""One-shot script: ensure every DynamoDB student has a Cognito account.

For students missing a Cognito user, the script:
1. Creates a Cognito user in the 'student' group.
2. Sets a temporary password (FORCE_CHANGE_PASSWORD).
3. Sends the portal credentials email via SES.

Usage:
    AWS_PROFILE=salle-cajas python3 scripts/reconcile_cognito.py

    # Dry-run (no changes, just report):
    AWS_PROFILE=salle-cajas python3 scripts/reconcile_cognito.py --dry-run
"""

from __future__ import annotations

import argparse
import secrets
import string
import sys
import time

import boto3

# ── Config ────────────────────────────────────────────────────────────────────
REGION = "us-west-2"
TABLE_NAME = "fitness-room-prod"
USER_POOL_ID = "us-west-2_nErXzvgfc"
PORTAL_URL = "https://portal.fitnessroom.mx"
GYM_NAME = "Fitness Room León"
SES_FROM = f"{GYM_NAME} <noreply@fitnessroom.mx>"
SES_REGION = "us-west-2"

# Emails to skip (tests, institutional, etc.)
EXCLUDE_EMAILS: set[str] = {
    "chaido@devzaga.com",
    "karina@salleleon.edu.mx",
}

session = boto3.Session(profile_name="salle-cajas", region_name=REGION)
dynamo = session.resource("dynamodb").Table(TABLE_NAME)
cognito = session.client("cognito-idp", region_name=REGION)
ses = session.client("ses", region_name=SES_REGION)


# ── Helpers ───────────────────────────────────────────────────────────────────

def generate_password(length: int = 12) -> str:
    """Generate a Cognito-compliant random password."""
    chars = string.ascii_letters + string.digits + "!@#$%&*"
    while True:
        pwd = "".join(secrets.choice(chars) for _ in range(length))
        if (any(c.isupper() for c in pwd)
                and any(c.islower() for c in pwd)
                and any(c.isdigit() for c in pwd)
                and any(c in "!@#$%&*" for c in pwd)):
            return pwd


def cognito_user_exists(email: str) -> bool:
    """Check if a Cognito user exists by email (username)."""
    try:
        cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=email)
        return True
    except cognito.exceptions.UserNotFoundException:
        return False


def create_cognito_student(email: str, name: str) -> str:
    """Create Cognito user in 'student' group. Returns temporary password."""
    password = generate_password()

    parts = name.strip().split(" ", 1)
    given = parts[0]
    family = parts[1] if len(parts) > 1 else parts[0]

    try:
        cognito.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "name", "Value": name},
                {"Name": "given_name", "Value": given},
                {"Name": "family_name", "Value": family},
            ],
            MessageAction="SUPPRESS",
        )
    except cognito.exceptions.UsernameExistsException:
        pass  # already exists, just reset password

    cognito.admin_set_user_password(
        UserPoolId=USER_POOL_ID,
        Username=email,
        Password=password,
        Permanent=False,
    )

    # Add to student group
    cognito.admin_add_user_to_group(
        UserPoolId=USER_POOL_ID,
        Username=email,
        GroupName="student",
    )

    return password


def send_credentials_email(name: str, email: str, password: str) -> bool:
    """Send portal credentials email via SES."""
    subject = f"🔐 Acceso al Portal de Alumnos — {GYM_NAME}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#1a1a1a;color:#ffffff;border-radius:12px;">
        <div style="text-align:center;padding:20px 0;border-bottom:2px solid #d4af37;">
            <h1 style="color:#d4af37;margin:0;">🏋️ {GYM_NAME}</h1>
        </div>
        <div style="padding:20px 0;">
            <p>Hola <strong>{name}</strong>,</p>
            <p>Tu cuenta del Portal de Alumnos está lista. Con ella puedes ver tus clases, reservar y consultar tu membresía.</p>
            <div style="background:#2a2a2a;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #d4af37;">
                <p style="margin:4px 0;"><strong>Portal:</strong> <a href="{PORTAL_URL}" style="color:#d4af37;">{PORTAL_URL}</a></p>
                <p style="margin:4px 0;"><strong>Usuario:</strong> {email}</p>
                <p style="margin:4px 0;"><strong>Contraseña temporal:</strong> <code style="background:#333;padding:2px 8px;border-radius:4px;color:#d4af37;">{password}</code></p>
            </div>
            <p style="font-size:13px;color:#999;">Al iniciar sesión por primera vez te pedirá cambiar la contraseña.</p>
        </div>
        <div style="text-align:center;padding-top:16px;border-top:1px solid #333;font-size:12px;color:#666;">
            <p>{GYM_NAME} · León, Guanajuato</p>
            <p>contacto@fitnessroom.mx</p>
        </div>
    </div>
    """
    try:
        ses.send_email(
            Source=SES_FROM,
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Html": {"Data": html, "Charset": "UTF-8"}},
            },
        )
        return True
    except Exception as exc:
        print(f"    ⚠️  Email failed for {email}: {exc}")
        return False


def scan_all_students() -> list[dict]:
    """Scan all students from DynamoDB."""
    students = []
    params: dict = {
        "FilterExpression": "begins_with(SK, :sk)",
        "ExpressionAttributeValues": {":sk": "PROFILE"},
    }
    while True:
        resp = dynamo.scan(**params)
        for item in resp.get("Items", []):
            email = item.get("email", "")
            if email:
                students.append({
                    "student_id": item.get("PK", "").replace("STUDENT#", ""),
                    "email": email,
                    "first_name": item.get("first_name", ""),
                    "last_name": item.get("last_name", ""),
                    "status": item.get("status", ""),
                })
        last_key = resp.get("LastEvaluatedKey")
        if not last_key:
            break
        params["ExclusiveStartKey"] = last_key
    return students


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Reconcile DynamoDB students → Cognito")
    parser.add_argument("--dry-run", action="store_true", help="Only report, don't create users")
    parser.add_argument("--no-email", action="store_true", help="Create users but don't send emails")
    args = parser.parse_args()

    print("🔍 Scanning all students from DynamoDB...")
    students = scan_all_students()
    print(f"   Found {len(students)} students with email.\n")

    missing = []
    for i, s in enumerate(students, 1):
        email = s["email"]
        exists = cognito_user_exists(email)
        status_icon = "✅" if exists else "❌"
        print(f"  [{i}/{len(students)}] {status_icon} {email}")
        if not exists:
            missing.append(s)
        # Rate limit: Cognito has 5 RPS for admin_get_user
        if i % 5 == 0:
            time.sleep(1)

    print(f"\n{'='*60}")
    print(f"📊 Results: {len(students)} total, {len(students)-len(missing)} have Cognito, {len(missing)} missing")
    print(f"{'='*60}\n")

    # Filter out excluded emails
    missing = [s for s in missing if s["email"].lower() not in {e.lower() for e in EXCLUDE_EMAILS}]

    if not missing:
        print("🎉 All students already have Cognito accounts!")
        return

    if args.dry_run:
        print("🏷️  DRY RUN — would create accounts for:")
        for s in missing:
            name = f"{s['first_name']} {s['last_name']}".strip()
            print(f"   - {s['email']} ({name})")
        return

    print(f"🚀 Creating {len(missing)} Cognito accounts...\n")
    created = 0
    emailed = 0

    for i, s in enumerate(missing, 1):
        email = s["email"]
        name = f"{s['first_name']} {s['last_name']}".strip() or email
        print(f"  [{i}/{len(missing)}] Creating: {email} ({name})")

        try:
            password = create_cognito_student(email, name)
            created += 1
            print(f"    ✅ Created (pwd: {password})")

            if not args.no_email:
                sent = send_credentials_email(name, email, password)
                if sent:
                    emailed += 1
                    print(f"    📧 Email sent")
        except Exception as exc:
            print(f"    ❌ Failed: {exc}")

        # Rate limit
        time.sleep(0.5)

    print(f"\n{'='*60}")
    print(f"✅ Done: {created}/{len(missing)} created, {emailed} emails sent")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
