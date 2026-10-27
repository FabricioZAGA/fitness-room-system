#!/usr/bin/env python3
"""v3.0.0 data migration — remove the 'cancelled' membership status.

Since v3.0.0 memberships are never cancelled (there are no refunds): early
renewals are queued, and deactivated/suspended students get their membership
frozen. This script rewrites the legacy records:

  cancelled → frozen   when the student is inactive/suspended, it is their most
                       recent membership, nothing newer replaced it and it still
                       had days left when it was cancelled (cancellation date =
                       updated_at). Frozen indefinitely from the cancellation
                       date, so unfreezing credits exactly the days it had left.
  cancelled → expired  every other case (renewals, manual cancellations, ...).
  active    → expired  active records whose (exclusive) end date already arrived
                       (the nightly roll job does the same from now on).

Idempotent: every write is conditioned on the current status, so re-running it
only touches records that still need it. Always run --dry-run first and review
the CSV report.

Usage:
    AWS_PROFILE=salle-cajas python3 scripts/migrate_v3_memberships.py --dry-run
    AWS_PROFILE=salle-cajas python3 scripts/migrate_v3_memberships.py --apply
"""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from datetime import UTC, date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

REGION = "us-west-2"
DEFAULT_TABLE = "fitness-room-prod"
MX_TZ = ZoneInfo("America/Mexico_City")
INACTIVE_STUDENT = {"inactive", "suspended"}
CURRENT = {"active", "frozen", "pending"}


def query_all(table: object, pk_value: str) -> list[dict]:
    """Every item of a GSI1 partition (follows pagination)."""
    items: list[dict] = []
    params: dict = {
        "IndexName": "GSI1",
        "KeyConditionExpression": Key("GSI1PK").eq(pk_value),
    }
    while True:
        resp = table.query(**params)  # type: ignore[attr-defined]
        items.extend(resp.get("Items", []))
        lek = resp.get("LastEvaluatedKey")
        if not lek:
            return items
        params["ExclusiveStartKey"] = lek


def mx_date(iso: str) -> date:
    """CDMX calendar date of an ISO-8601 timestamp."""
    dt = datetime.fromisoformat(iso)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(MX_TZ).date()


def plan(memberships: list[dict], students: dict[str, dict], today: date) -> list[dict]:
    """Decide the new status of every membership that needs migrating."""
    by_student: dict[str, list[dict]] = defaultdict(list)
    for m in memberships:
        by_student[m["student_id"]].append(m)

    changes: list[dict] = []
    for student_id, items in by_student.items():
        student = students.get(student_id, {})
        student_status = student.get("status", "unknown")
        latest = max(items, key=lambda m: m.get("created_at", ""))
        has_current = any(
            m["status"] in CURRENT and date.fromisoformat(m["end_date"]) > today
            for m in items
        )

        for m in items:
            end = date.fromisoformat(m["end_date"])
            change: dict | None = None
            if m["status"] == "cancelled":
                cancelled_on = mx_date(m.get("updated_at") or m["created_at"])
                newer = [o for o in items if o.get("created_at", "") > m.get("created_at", "")]
                if (
                    student_status in INACTIVE_STUDENT
                    and m is latest
                    and not newer
                    and not has_current
                    and cancelled_on < end
                ):
                    change = {
                        "new_status": "frozen",
                        "freeze_start_date": cancelled_on.isoformat(),
                        "reason": f"student {student_status}; {(end - cancelled_on).days} days left "
                        f"when cancelled on {cancelled_on}",
                    }
                else:
                    reason = (
                        "replaced by a newer membership (renewal)"
                        if newer
                        else "no days left when cancelled"
                        if cancelled_on >= end
                        else f"cancelled while student {student_status}"
                    )
                    change = {"new_status": "expired", "reason": reason}
            elif m["status"] == "active" and end <= today:
                change = {"new_status": "expired", "reason": f"end date {end} already arrived"}

            if change:
                changes.append(
                    {
                        "student_id": student_id,
                        "student_name": f"{student.get('first_name', '')} "
                        f"{student.get('last_name', '')}".strip(),
                        "student_status": student_status,
                        "membership_id": m["membership_id"],
                        "membership_type": m.get("membership_type", ""),
                        "start_date": m["start_date"],
                        "end_date": m["end_date"],
                        "old_status": m["status"],
                        "freeze_start_date": "",
                        **change,
                        "_pk": m["PK"],
                        "_sk": m["SK"],
                    }
                )
    return changes


def apply_change(table: object, c: dict) -> bool:
    """Write one change, conditioned on the old status (idempotent)."""
    now = datetime.now(UTC).isoformat()
    values: dict = {
        ":new": c["new_status"],
        ":old": c["old_status"],
        ":gsi3": f"INACTIVE_MEMBERSHIP#{c['membership_id']}",
        ":now": now,
    }
    expr = "SET #s = :new, GSI3SK = :gsi3, updated_at = :now"
    if c["new_status"] == "frozen":
        expr += ", is_frozen = :t, freeze_start_date = :fs, freeze_end_date = :null"
        values.update({":t": True, ":fs": c["freeze_start_date"], ":null": None})
    try:
        table.update_item(  # type: ignore[attr-defined]
            Key={"PK": c["_pk"], "SK": c["_sk"]},
            UpdateExpression=expr,
            ConditionExpression="#s = :old",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues=values,
        )
        return True
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return False
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description="v3.0.0 membership status migration")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Report only, no writes")
    mode.add_argument("--apply", action="store_true", help="Write the changes")
    parser.add_argument("--table", default=DEFAULT_TABLE)
    parser.add_argument("--profile", default="salle-cajas")
    parser.add_argument(
        "--report",
        default=f"/tmp/migrate_v3_memberships_{datetime.now():%Y%m%d_%H%M%S}.csv",
        help="CSV report path (contains student names — do not commit it)",
    )
    args = parser.parse_args()

    session = boto3.Session(profile_name=args.profile, region_name=REGION)
    table = session.resource("dynamodb").Table(args.table)
    today = datetime.now(MX_TZ).date()

    print(f"🔍 Reading memberships and students from {args.table} (today CDMX: {today}) ...")
    memberships = query_all(table, "MEMBERSHIPS")
    students = {s["student_id"]: s for s in query_all(table, "STUDENTS")}
    changes = plan(memberships, students, today)

    fields = [
        "student_id", "student_name", "student_status", "membership_id", "membership_type",
        "start_date", "end_date", "old_status", "new_status", "freeze_start_date", "reason",
    ]
    Path(args.report).parent.mkdir(parents=True, exist_ok=True)
    with open(args.report, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(changes)

    summary: dict[str, int] = defaultdict(int)
    for c in changes:
        summary[f"{c['old_status']} → {c['new_status']}"] += 1
    print(f"   {len(memberships)} memberships, {len(students)} students.")
    for k, v in sorted(summary.items()):
        print(f"   {k}: {v}")
    print(f"📄 Report: {args.report}")

    if args.dry_run:
        print("✅ Dry run — nothing was written.")
        return

    written = skipped = 0
    for c in changes:
        if apply_change(table, c):
            written += 1
        else:
            skipped += 1
    print(f"✅ Applied {written} changes ({skipped} skipped: status changed meanwhile).")


if __name__ == "__main__":
    main()
