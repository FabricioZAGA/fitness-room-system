#!/usr/bin/env python3
"""Backfill ``booking_opens_days_before`` on class items created before v3.2.0.

The API already treats a missing attribute as the default (1 day), so this
script only makes the stored data explicit. It never overwrites a value that
is already set (conditional write on ``attribute_not_exists``).

Usage:
    AWS_PROFILE=salle-cajas python3 scripts/backfill_class_booking_window.py --dry-run
    AWS_PROFILE=salle-cajas python3 scripts/backfill_class_booking_window.py
    AWS_PROFILE=salle-cajas python3 scripts/backfill_class_booking_window.py \
        --days 1 --from 2026-01-01
"""

from __future__ import annotations

import argparse

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

REGION = "us-west-2"
TABLE_NAME = "fitness-room-prod"
ATTRIBUTE = "booking_opens_days_before"
DEFAULT_DAYS = 1

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


def main() -> None:
    """Set the booking window on every class that does not have one yet."""
    parser = argparse.ArgumentParser(description="Backfill class booking window")
    parser.add_argument("--dry-run", action="store_true", help="Report only, no writes")
    parser.add_argument(
        "--from", dest="from_date", default="0000-00-00",
        help="Only classes on/after this date (YYYY-MM-DD). Default: all classes.",
    )
    parser.add_argument(
        "--days", type=int, default=DEFAULT_DAYS,
        help=f"Days before the class when enrollment opens. Default: {DEFAULT_DAYS}.",
    )
    args = parser.parse_args()
    if not 0 <= args.days <= 30:
        parser.error("--days must be between 0 and 30")

    print(f"🔍 Scanning classes from {args.from_date} in {TABLE_NAME} ...")
    classes = list_classes(args.from_date)
    missing = [c for c in classes if ATTRIBUTE not in c]
    print(f"   Found {len(classes)} classes, {len(missing)} without {ATTRIBUTE}.\n")

    updated = 0
    for c in missing:
        label = f"{c.get('class_date')} {str(c.get('start_time', ''))[:5]} {c.get('class_type')}"
        print(f"  ➕ {label:<45} {ATTRIBUTE} = {args.days}")
        if args.dry_run:
            continue
        try:
            table.update_item(
                Key={"PK": c["PK"], "SK": c["SK"]},
                UpdateExpression="SET #a = :d",
                ConditionExpression="attribute_not_exists(#a)",
                ExpressionAttributeNames={"#a": ATTRIBUTE},
                ExpressionAttributeValues={":d": args.days},
            )
            updated += 1
        except ClientError as e:
            if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
                raise

    print(f"\n{'='*60}")
    if not missing:
        print("✅ Every class already has a booking window.")
    elif args.dry_run:
        print(f"🏷️  DRY RUN — {len(missing)} class(es) would be updated.")
    else:
        print(f"✅ Updated {updated} class(es).")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
