# Release Checklist — Fitness Room System

Use this checklist before every production deployment.

---

## Pre-Release Validation

### Code Quality
- [ ] All backend mypy checks pass: `cd backend && uv run mypy src/`
- [ ] All backend ruff checks pass: `cd backend && uv run ruff check src/`
- [ ] All frontend TypeScript checks pass: `cd frontend && npx tsc --noEmit`
- [ ] All frontend ESLint checks pass: `cd frontend && npx eslint src/`
- [ ] All portal TypeScript checks pass: `cd portal && npx tsc --noEmit`
- [ ] All portal ESLint checks pass: `cd portal && npx eslint src/`

### Tests
- [ ] All backend tests pass: `cd backend && uv run pytest tests/`
- [ ] All frontend tests pass: `cd frontend && npm test`
- [ ] Manual smoke test of critical flows (see below)

### Version Sync
- [ ] Run `./scripts/check-version.sh` — all versions must match
- [ ] Changelog entry added to `frontend/src/lib/changelog.ts`
- [ ] CHANGELOG.md updated with release notes

### Build Validation
- [ ] Backend compiles: `cd backend && python -c "from src.main import app"`
- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] Portal builds: `cd portal && npm run build`

---

## Deployment Steps

### 1. Backend (Lambda via CDK)
```bash
cd infrastructure/cdk
AWS_PROFILE=salle-cajas npx aws-cdk deploy FitnessRoomApiStack-prod --require-approval never
```

### 2. Frontend Admin (S3 + CloudFront)
```bash
./scripts/deploy-frontend.sh admin
```

### 3. Portal (S3 + CloudFront)
```bash
./scripts/deploy-frontend.sh portal
```

> The script uploads `index.html` with `no-cache` and `assets/*` as `immutable`, then
> invalidates CloudFront. Do **not** replace it with a raw `aws s3 sync --delete` — that
> leaves `index.html` without `Cache-Control` and causes black screens after the next deploy.

### 4. Verify Deployment
```bash
curl -s https://api.fitnessroom.mx/health | python3 -m json.tool
# Expected: { "status": "ok", "version": "X.Y.Z", "environment": "prod" }
```

---

## Post-Deployment Smoke Tests

### Critical Path Testing
1. **Login Flow**
   - [ ] Admin can log in at admin.fitnessroom.mx
   - [ ] Student can log in at portal.fitnessroom.mx

2. **Check-in Flow** (most frequent operation)
   - [ ] Search finds existing student
   - [ ] Check-in succeeds for active member
   - [ ] Check-in denied for inactive/expired

3. **Student CRUD**
   - [ ] Can create new student
   - [ ] Can view student details
   - [ ] Can update student info

4. **Membership Flow**
   - [ ] Can assign new membership
   - [ ] Can view membership status
   - [ ] Expiry dates calculated correctly

5. **Portal**
   - [ ] Dashboard loads
   - [ ] QR code displays
   - [ ] Class schedule visible

---

## Rollback Procedure

If issues detected post-deployment:

### Immediate Rollback (< 5 min)
```bash
# Redeploy previous Lambda version via CDK
cd infrastructure/cdk
git checkout HEAD~1 -- ../backend
AWS_PROFILE=salle-cajas npx aws-cdk deploy FitnessRoomApiStack-prod
```

### Frontend Rollback
```bash
# Restore from S3 versioning or redeploy from previous commit
git checkout HEAD~1 -- frontend
./scripts/deploy-frontend.sh admin
```

---

## Monitoring Checklist

After deployment, monitor for 30 minutes:

- [ ] No 5xx errors in API Gateway logs
- [ ] Lambda cold start times acceptable (< 3s)
- [ ] CloudFront serving updated assets (check version in footer)
- [ ] No customer-reported issues

---

## Emergency Contacts

- **AWS Account**: 948999370306
- **AWS Profile**: salle-cajas
- **Region**: us-west-2 (primary), us-east-1 (CloudFront certs)

---

*Last updated: 2026-04-24*
