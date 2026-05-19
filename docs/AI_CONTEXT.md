# AI Context — Fitness Room System

Quick-start for AI assistants. For full detail read [`../CLAUDE.md`](../CLAUDE.md) and [`../.claude/CLAUDE.md`](../.claude/CLAUDE.md).

> **Version:** 1.8.5 — production live since 2026-05-01.

---

## What this repo is

A gym management system for **Fitness Room**, a fitness studio in León, Mexico. Handles members, memberships, classes, check-ins, instructors, cash register, inventory, reports, and a member-facing portal.

---

## Apps

| App | Path | Stack | Audience |
|-----|------|-------|----------|
| **Admin** | `frontend/` | React 19 + Vite 6 + Tailwind 4 + TanStack Router/Query | Owner, manager, reception |
| **Portal** | `portal/` | React 19 + Vite 6 + Tailwind 3.4 + React Router DOM 7 | Members + instructors |
| **API** | `backend/` | Python 3.12 + FastAPI + Lambda + DynamoDB | Powers admin + portal |
| **Gym landing** | `gym-landing/` | Next.js 15 | Marketing — `fitnessroom.mx` |
| **Platform landing** | `landing/` | Next.js 15 | Pitch — `platform.fitnessroom.mx` |

Production URLs: `admin|portal|api|fitnessroom|platform.fitnessroom.mx`.

---

## Architecture rule of thumb

```text
Browser → CloudFront → S3 (React SPA)
        → API Gateway v2 → Lambda (FastAPI + Mangum) → DynamoDB single-table
              ↑
        Cognito JWT
```

Backend layered: `routers/` (HTTP) → `services/` (business logic) → `repositories/` (DynamoDB only).

**Never** call boto3 from a router or service. **Never** add `bg-slate-*` / hardcoded hex colors in frontend JSX — use CSS variables defined in `frontend/src/index.css`.

---

## Most relevant business invariants

- **Reservation status `attended` is "still active"**: it counts toward occupancy, must appear in attendees lists, and counts for the 1-class-per-day rule. Bug filtered it out before v1.8.5.
- **1 class/day rule** applies to membership types `founder`, `room_daily`, `room_pass`. Validated when reserving from admin and from portal.
- **i18n paridad obligatoria**: 452 keys, ES (default) + EN. Adding a key in one file requires adding it in the other.
- **Versioning** lives in 5 sites (`VERSION`, frontend `package.json`, `changelog.ts` × 2, `health.py`, `CHANGELOG.md`). `./scripts/bump-version.sh X.Y.Z` keeps them in sync.

---

## What to read next

| Want to… | Read |
|---|---|
| Understand patterns and design system | [`../CLAUDE.md`](../CLAUDE.md) |
| Get AWS account IDs, CloudFront IDs, S3 buckets, deploy commands | [`../.claude/CLAUDE.md`](../.claude/CLAUDE.md) |
| Onboard a fresh dev | [`getting-started.md`](getting-started.md) |
| Understand DB layout | [`architecture/database-design.md`](architecture/database-design.md) |
| Understand business flows | [`flows/gym-operations.md`](flows/gym-operations.md) |
| See the directory map | [`REPO_MAP.md`](REPO_MAP.md) |
| Check the release checklist | [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md) |

---

*Last updated 2026-05-19 — v1.8.5*
