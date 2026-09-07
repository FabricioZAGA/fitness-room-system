#!/usr/bin/env python3
"""Repair drifted reservations_count / waitlist_count on class items.

Source of truth:
  reservations_count = RESERVATION# items with status in {confirmed, attended, no_show}
  waitlist_count     = number of WAITLIST# items

Usage:
    AWS_PROFILE=salle-cajas python3 scripts/recount_class_counters.py --dry-run
    AWS_PROFILE=salle-cajas python3 scripts/recount_class_counters.py
    AWS_PROFILE=salle-cajas python3 scripts/recount_class_counters.py --from 2026-09-01
"""

from __future__ import annotations

import argparse
from datetime import date

import boto3
from boto3.dynamodb.conditions import Key

REGION = "us-west-2"
TABLE_NAME = "fitness-room-prod"
COUNTED = {"confirmed", "attended", "no_show"}

session = boto3.Session(profile_name="salle-cajas", region_name=REGION)
table = session.resource("dynamodb").Table(TABLE_NAME)


def list_classes(from_date: str) -> list[dict]:
    """All class PROFILE items from a given date onward (via GSI1 CLASSES)."""
    items: list[dict] = []
    params: dict = {
        "IndexName": "GSI1",
        "KeyConditionExpression": Key("GSI1PK").eq("CLASSES")
        & Key("GSI1SK").between(f"DATE#{from_date}", "DATE#9999~"),
    }
    while True:
        resp = table.query(**params)
        items.extend(resp.get("Items", []))
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            break
        params["ExclusiveStartKey"] = lek
    return items


def recount(class_id: str) -> tuple[int, int]:
    """Count RESERVATION# (counted statuses) and WAITLIST# under a class PK."""
    reservations = 0
    waitlist = 0
    params: dict = {"KeyConditionExpression": Key("PK").eq(f"CLASS#{class_id}")}
    while True:
        resp = table.query(**params)
        for raw in resp.get("Items", []):
            sk = str(raw.get("SK", ""))
            if sk.startswith("RESERVATION#") and raw.get("status") in COUNTED:
                reservations += 1
            elif sk.startswith("WAITLIST#"):
                waitlist += 1
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            break
        params["ExclusiveStartKey"] = lek
    return reservations, waitlist


def main() -> None:
    parser = argparse.ArgumentParser(description="Recount class reservation counters")
    parser.add_argument("--dry-run", action="store_true", help="Report only, no writes")
    parser.add_argument(
        "--from", dest="from_date", default=date.today().isoformat(),
        help="Only classes on/after this date (YYYY-MM-DD). Default: today.",
    )
    args = parser.parse_args()

    print(f"🔍 Scanning classes from {args.from_date} ...")
    classes = list_classes(args.from_date)
    print(f"   Found {len(classes)} classes.\n")

    drifted = 0
    for c in classes:
        class_id = str(c.get("class_id") or c["PK"].replace("CLASS#", ""))
        stored_r = int(c.get("reservations_count", 0))
        stored_w = int(c.get("waitlist_count", 0))
        real_r, real_w = recount(class_id)

        if stored_r == real_r and stored_w == real_w:
            continue

        drifted += 1
        label = f"{c.get('class_date')} {str(c.get('start_time', ''))[:5]} {c.get('class_type')}"
        print(
            f"  ⚠️  {label:<40} res {stored_r}→{real_r:<3} wl {stored_w}→{real_w:<3} "
            f"(cap {c.get('capacity')})"
        )

        if not args.dry_run:
            table.update_item(
                Key={"PK": c["PK"], "SK": c["SK"]},
                UpdateExpression="SET reservations_count = :r, waitlist_count = :w",
                ExpressionAttributeValues={":r": real_r, ":w": real_w},
            )

    print(f"\n{'='*60}")
    if drifted == 0:
        print("✅ All counters already consistent.")
    elif args.dry_run:
        print(f"🏷️  DRY RUN — {drifted} class(es) would be fixed.")
    else:
        print(f"✅ Fixed {drifted} class(es).")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
