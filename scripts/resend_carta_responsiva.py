#!/usr/bin/env python3
"""One-shot: resend the signed Carta Responsiva to existing students.

Safety model:
  - Default mode is --mode dry-run: lists every recipient and exits.
  - --mode preview: sends to a single override email (for visual QA).
  - --mode apply: sends to the real list with rate limiting.

Usage:
  # 1. Preview against devzaga@gmail.com first
  AWS_PROFILE=salle-cajas python scripts/resend_carta_responsiva.py \
      --mode preview --preview-email devzaga@gmail.com \
      --preview-name "Angel Zacarías"

  # 2. Dry-run (no emails sent, prints the list)
  AWS_PROFILE=salle-cajas python scripts/resend_carta_responsiva.py \
      --mode dry-run

  # 3. Real send (after confirming the list)
  AWS_PROFILE=salle-cajas python scripts/resend_carta_responsiva.py \
      --mode apply
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Point the backend at prod resources BEFORE importing it.
os.environ.setdefault("ENVIRONMENT", "prod")
os.environ.setdefault("AWS_REGION", "us-west-2")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-west-2")
os.environ.setdefault("DYNAMODB_TABLE_NAME", "fitness-room-prod")
os.environ.setdefault("COGNITO_USER_POOL_ID", "us-west-2_nErXzvgfc")
os.environ.setdefault("COGNITO_CLIENT_ID", "5gh653258b0kjbhupivfpcegqs")
os.environ.setdefault("COGNITO_REGION", "us-west-2")
os.environ.setdefault("SES_SENDER_EMAIL", "noreply@fitnessroom.mx")
os.environ.setdefault("SES_SENDER_NAME", "Fitness Room")
os.environ.setdefault("FRONTEND_URL", "https://admin.fitnessroom.mx")
os.environ.setdefault("PORTAL_URL", "https://portal.fitnessroom.mx")

# Ensure `src` package is on path.
BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))

from src.models.student import StudentStatus  # noqa: E402
from src.repositories.student_repository import StudentRepository  # noqa: E402
from src.services.event_notifier import EventNotifier  # noqa: E402


def load_active_students() -> list[tuple[str, str]]:
    """Return (full_name, email) tuples for every ACTIVE student in prod."""
    repo = StudentRepository()
    all_students: list = []
    last_key = None
    while True:
        items, last_key = repo.list_all(
            status=StudentStatus.ACTIVE,
            limit=200,
            last_evaluated_key=last_key,
        )
        all_students.extend(items)
        if not last_key:
            break

    out: list[tuple[str, str]] = []
    for s in all_students:
        email = (getattr(s, "email", "") or "").strip()
        if not email:
            continue
        name = f"{s.first_name} {s.last_name}".strip()
        out.append((name, email))
    return out


def send_one(name: str, email: str) -> tuple[bool, str]:
    """Send the signed carta to one recipient. Returns (ok, detail)."""
    try:
        EventNotifier().notify_welcome_carta_responsiva(
            student_name=name,
            student_email=email,
        )
        return True, "sent"
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--mode",
        choices=["dry-run", "preview", "apply"],
        default="dry-run",
    )
    ap.add_argument("--preview-email", help="Override recipient for --mode preview")
    ap.add_argument("--preview-name", help="Override name for --mode preview")
    ap.add_argument(
        "--rate-per-sec",
        type=float,
        default=5.0,
        help="Max messages per second during --mode apply",
    )
    args = ap.parse_args()

    if args.mode == "preview":
        if not args.preview_email or not args.preview_name:
            print("ERROR: --mode preview requires --preview-email and --preview-name")
            return 2
        print(f"[preview] sending to {args.preview_name} <{args.preview_email}>")
        ok, detail = send_one(args.preview_name, args.preview_email)
        print(f"[preview] {'OK' if ok else 'FAIL'} — {detail}")
        return 0 if ok else 1

    print(f"[{args.mode}] loading active students from prod DynamoDB…")
    recipients = load_active_students()
    print(f"[{args.mode}] total active students with email: {len(recipients)}")

    if args.mode == "dry-run":
        print()
        print("Would send to:")
        for i, (name, email) in enumerate(recipients, 1):
            print(f"  {i:3d}. {name:40s} <{email}>")
        print()
        print("No emails sent. Re-run with --mode apply to send for real.")
        return 0

    # --mode apply
    started_at = datetime.now(timezone.utc)
    print(f"[apply] starting send at {started_at.isoformat()}")
    print(f"[apply] rate limit: {args.rate_per_sec}/s")
    delay = 1.0 / args.rate_per_sec
    sent = 0
    failed = 0
    failures: list[tuple[str, str, str]] = []

    for i, (name, email) in enumerate(recipients, 1):
        ok, detail = send_one(name, email)
        status = "OK  " if ok else "FAIL"
        print(f"  [{i:3d}/{len(recipients)}] {status} {email} — {detail}")
        if ok:
            sent += 1
        else:
            failed += 1
            failures.append((name, email, detail))
        time.sleep(delay)

    print()
    print("Summary:")
    print(f"  sent:   {sent}")
    print(f"  failed: {failed}")
    if failures:
        print()
        print("Failures:")
        for name, email, detail in failures:
            print(f"  - {name} <{email}>: {detail}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
