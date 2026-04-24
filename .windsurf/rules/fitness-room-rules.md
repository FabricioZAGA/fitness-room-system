---
trigger: always_on
---

# Fitness Room System — Windsurf AI Rules

> Full project documentation: `.claude/CLAUDE.md` — READ IT for architecture, design system, and deployment details.

## Project Identity
- **Project**: Fitness Room Management System
- **AWS Account**: `948999370306`
- **AWS Profile**: `salle-cajas` — ALWAYS use for ALL AWS/CDK commands
- **AWS Region**: `us-west-2` (primary), `us-east-1` (CloudFront certs only)
- **GitHub**: FabricioZAGA (personal — NEVER touch Realtor/work repos)

## Version Sync — CRITICAL (5 files must match)
When bumping version, update ALL of these in a single commit:
1. `VERSION` (root) — plain text
2. `frontend/package.json` — `"version"` field
3. `frontend/src/lib/changelog.ts` — `APP_VERSION` constant + new entry at TOP of `changelog[]`
4. `backend/src/routers/health.py` — `version=` in HealthResponse
5. `CHANGELOG.md` (root) — new section at TOP (Keep a Changelog format)

## Deploy Targets (production only)
- **Backend Lambda**: `AWS_PROFILE=salle-cajas npx aws-cdk deploy FitnessRoomApiStack-prod --require-approval never` (from `infrastructure/cdk/`)
- **Frontend Admin**: S3 `fitness-room-frontend-prod-948999370306` → CloudFront `E1B51EPZN5PP0I` → `admin.fitnessroom.mx`
- **Student Portal**: S3 `fitness-room-portal-prod-948999370306` → CloudFront `E1VDFNEUSV0C0D` → `portal.fitnessroom.mx`
- **API Health**: `curl -s https://api.fitnessroom.mx/health`
- Use `/release` workflow for the full step-by-step process

## Git Conventions
- Branch: `fzacarias/fire-XXXX/short-description`
- Commits: Conventional (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`)
- **NEVER push without personal review** — `git push` requires explicit user approval

## Code Quality
- **Python**: Type hints on ALL functions; Pydantic v2 for I/O; docstrings everywhere; `ruff` lint; `mypy` types
- **TypeScript**: `strict: true`; NO `any`; explicit return types; `tsc --noEmit` must pass
- **i18n**: Every user-visible string must have keys in BOTH `es.json` AND `en.json`
- **Errors**: Use `getApiErrorMessage(error, fallback)` in frontend mutation `onError` handlers

## Architecture (MANDATORY)
- Backend: `routers → services → repositories` — NO direct boto3 from services
- Frontend: `routes → components → hooks → services → types` — TanStack Router + Query
- DynamoDB: single-table, access via repository layer only
- Auth: Cognito JWT on all endpoints except `/health`
- Design: CSS variables (Black & Gold) — NEVER use Tailwind color utilities directly
- CDK: one stack per domain, `FitnessRoom{Module}Stack-{env}` naming

## Naming
- Python: `snake_case` functions/vars, `PascalCase` classes
- TypeScript: `camelCase` functions/vars, `PascalCase` types/components
- DynamoDB: `SCREAMING_SNAKE#id` (e.g., `STUDENT#abc123`)

## Phases — DO NOT implement future phases without explicit instruction
- Phase 1 ✅ | Phase 2 ✅ | Phase 2.5 ✅ | Phase 3 🔜 | Phase 4 🔜
