# scripts/legacy/

One-shot scripts that already ran in production. Kept here for audit/rollback only.

| Script | Ran on | Purpose |
|---|---|---|
| `migrate_types.py` | v1.7.0 release | Migrated old `MembershipType` and `ClassType` enums (monthly/quarterly/etc) to the new dynamic catalog used since v1.7.0. |
| `resend_carta_responsiva.py` | v1.7.2 release | Bulk-resent the signed Carta Responsiva PDF to existing students after we polished the template. |

Do not re-run unless coordinated with the data owner. Both scripts mutate production data.
