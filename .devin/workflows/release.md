---
description: Bump version, update changelog, commit, and deploy to AWS production
---

## Release & Deploy — Fitness Room System

Use this workflow when the user asks to "deploy", "release", "actualiza versión", "haz deploy", or similar.

### 1. Determine the new version number

Ask the user if not specified. Follow semver:
- **Patch** (x.y.Z): bug fixes, UI tweaks, i18n updates
- **Minor** (x.Y.0): new features, new modules, new API endpoints
- **Major** (X.0.0): breaking changes

### 2. Update ALL version files (5 places — ALL are mandatory)

**2a.** `VERSION` (root) — plain text, e.g. `1.5.3`
**2b.** `frontend/package.json` — `"version": "1.5.3"`
**2c.** `frontend/src/lib/changelog.ts` — update `APP_VERSION` constant AND add new entry at TOP of `changelog[]` array
**2d.** `backend/src/routers/health.py` — update `version="1.5.3"` in the HealthResponse
**2e.** `CHANGELOG.md` (root) — add new `## [1.5.3]` section at the TOP following Keep a Changelog format

The changelog.ts entry format:
```typescript
{
  version: "1.5.3",
  date: "YYYY-MM-DD",    // today's date
  title: "Título corto en español",
  items: [
    { icon: "🔒", text: "Descripción del cambio en español" },
  ],
}
```

### 3. Verify everything compiles

// turbo
```bash
cd backend && python -c "from src.main import app; print('Backend OK')"
```

// turbo
```bash
cd frontend && npx tsc --noEmit && echo "Frontend OK"
```

### 4. Commit with conventional commit

```bash
git add -A
git commit -m "chore: bump version to X.Y.Z

- Summary of what changed in this release"
```

**NEVER push automatically** — wait for user approval.

### 5. Deploy CDK (backend Lambda)

```bash
cd infrastructure/cdk
AWS_PROFILE=salle-cajas npx aws-cdk deploy FitnessRoomApiStack-prod --require-approval never
```

### 6. Deploy frontend admin to S3 + CloudFront

```bash
./scripts/deploy-frontend.sh admin
```

### 7. Deploy portal (only if portal code changed)

```bash
./scripts/deploy-frontend.sh portal
```

> **NEVER** use a plain `aws s3 sync dist/ s3://... --delete` for the frontends. It uploads
> `index.html` without `Cache-Control`; browsers cache it, and after the next deploy the stale
> `index.html` references a deleted hashed bundle → black screen for users. The script sets
> `no-cache` on `index.html` and `immutable` on `assets/*` (same as `buildspec-frontend.yml`).

### 8. Verify deployment

// turbo
```bash
curl -s https://api.fitnessroom.mx/health | python3 -m json.tool
```

Expected output: `"version": "X.Y.Z"`, `"status": "ok"`, `"environment": "prod"`

### Notes
- AWS Profile is ALWAYS `salle-cajas`
- Only production environment exists (no dev/staging)
- CDK deploy updates Lambda code; `scripts/deploy-frontend.sh` updates frontend static files
- CloudFront invalidation is REQUIRED after S3 upload (the script does it)
- Never deploy without compiling first
- Never push git without user approval
