#!/usr/bin/env python3
"""One-shot migration: old membership/class types → new catalog (v1.7.0).

Old enums that shipped in production:
  MembershipType: monthly, quarterly, semi_annual, annual, founder_monthly,
                  class_pack_5, class_pack_10, class_pack_20, day_pass
  ClassType:      zumba, strong, yoga, hiit, pilates, cycling, other
                  (portal mocks also referenced spinning/cross_training/boxing/functional/stretching)

New catalog (Fitness Room León):
  MembershipType: founder, room_daily, room_elite, room_flex, room_pass
  ClassType:      hyrox, strong_nation, entrenamiento_funcional, yoga, mat, zumba, other

Usage:
    # Dry run against prod (default — shows what would change, writes nothing):
    AWS_PROFILE=salle-cajas python scripts/migrate_types.py --table fitness-room-prod

    # Apply changes:
    AWS_PROFILE=salle-cajas python scripts/migrate_types.py --table fitness-room-prod --apply

    # Different region:
    AWS_PROFILE=salle-cajas python scripts/migrate_types.py --table fitness-room-prod --region us-west-2 --apply
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from typing import Any

import boto3


MEMBERSHIP_MAP: dict[str, str] = {
    # Old → new (price tier used to pick the closest new plan)
    "founder_monthly": "founder",
    "monthly": "room_daily",        # $1,300/mes, 1 sesión/día — closest to legacy monthly
    "quarterly": "room_elite",      # upgrade to unlimited; quarterly users had premium intent
    "semi_annual": "room_elite",
    "annual": "room_elite",
    "class_pack_5": "room_flex",    # 12 sessions, flexible schedule
    "class_pack_10": "room_flex",
    "class_pack_20": "room_flex",
    "day_pass": "room_pass",
}

CLASS_MAP: dict[str, str] = {
    "strong": "strong_nation",
    "hiit": "entrenamiento_funcional",
    "pilates": "mat",
    "cycling": "entrenamiento_funcional",
    # Portal-only legacy values (should not be in DDB, but map defensively):
    "spinning": "entrenamiento_funcional",
    "cross_training": "entrenamiento_funcional",
    "boxing": "entrenamiento_funcional",
    "functional": "entrenamiento_funcional",
    "stretching": "mat",
    # Already-valid values are left alone.
}


def migrate(table_name: str, region: str, apply: bool) -> int:
    """Scan the table, rewrite old type strings, and report counts.

    Returns non-zero exit code if unexpected errors occur; 0 otherwise.
    """
    ddb = boto3.resource("dynamodb", region_name=region)
    table = ddb.Table(table_name)

    membership_counter: Counter[str] = Counter()
    class_counter: Counter[str] = Counter()
    updates: list[dict[str, Any]] = []

    print(f"[migrate] Scanning table={table_name} region={region} dry_run={not apply}...")

    last_evaluated_key = None
    scanned = 0
    while True:
        kwargs: dict[str, Any] = {"Limit": 500}
        if last_evaluated_key:
            kwargs["ExclusiveStartKey"] = last_evaluated_key
        resp = table.scan(**kwargs)
        items = resp.get("Items", [])
        scanned += len(items)

        for item in items:
            entity_type = item.get("EntityType")

            if entity_type == "MEMBERSHIP":
                old = item.get("membership_type")
                if old in MEMBERSHIP_MAP:
                    new = MEMBERSHIP_MAP[old]
                    membership_counter[f"{old} → {new}"] += 1
                    updates.append({
                        "kind": "membership",
                        "pk": item["PK"],
                        "sk": item["SK"],
                        "old_type": old,
                        "new_type": new,
                        "gsi2pk": f"MEMBERSHIP_TYPE#{new}",
                    })

            elif entity_type == "CLASS":
                old = item.get("class_type")
                if old in CLASS_MAP:
                    new = CLASS_MAP[old]
                    class_counter[f"{old} → {new}"] += 1
                    updates.append({
                        "kind": "class",
                        "pk": item["PK"],
                        "sk": item["SK"],
                        "old_type": old,
                        "new_type": new,
                    })

        last_evaluated_key = resp.get("LastEvaluatedKey")
        if not last_evaluated_key:
            break

    print(f"[migrate] Scanned {scanned} items. Planned changes: {len(updates)}")
    print("[migrate] Membership type remapping:")
    for label, count in membership_counter.most_common():
        print(f"  {count:>5}  {label}")
    print("[migrate] Class type remapping:")
    for label, count in class_counter.most_common():
        print(f"  {count:>5}  {label}")

    if not apply:
        print("[migrate] Dry run — no writes. Re-run with --apply to commit.")
        return 0

    if not updates:
        print("[migrate] Nothing to update.")
        return 0

    print(f"[migrate] Applying {len(updates)} updates...")
    for i, u in enumerate(updates, 1):
        key = {"PK": u["pk"], "SK": u["sk"]}
        if u["kind"] == "membership":
            table.update_item(
                Key=key,
                UpdateExpression="SET membership_type = :t, GSI2PK = :gsi",
                ExpressionAttributeValues={
                    ":t": u["new_type"],
                    ":gsi": u["gsi2pk"],
                },
            )
        else:
            table.update_item(
                Key=key,
                UpdateExpression="SET class_type = :t",
                ExpressionAttributeValues={":t": u["new_type"]},
            )
        if i % 50 == 0:
            print(f"  ... {i}/{len(updates)} updated")

    print(f"[migrate] Done. {len(updates)} items updated.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Migrate legacy membership/class types to new catalog")
    ap.add_argument("--table", required=True, help="DynamoDB table name")
    ap.add_argument("--region", default="us-west-2", help="AWS region (default us-west-2)")
    ap.add_argument("--apply", action="store_true", help="Commit changes (default is dry-run)")
    args = ap.parse_args()
    return migrate(args.table, args.region, args.apply)


if __name__ == "__main__":
    sys.exit(main())
