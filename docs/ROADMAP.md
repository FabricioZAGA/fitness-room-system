# Roadmap — Fitness Room System

Future improvements prioritized by impact and effort.

---

## Deferred — cost/time (owner decision 2026-04-24)

Explicitly parked because added cost/time is not justified right now.
Revisit only if a real incident or scale change makes the ROI obvious.

- **Staging environment** — `ENV_NAME` parameterization on `app.py` +
  `cdk.json` context, parallel `-staging` stack set. Would catch
  incidents like `ApiGatewayManagedOverrides` rollback before prod.
  Cost: ~$10–20/mo of always-on stacks + 30–45 min setup.
  Mitigation today: keep changes small, run `cdk synth` first, pre-deploy
  `curl /health` smoke check.
- **GitHub Actions CI gate with coverage** — `.github/workflows/ci.yml`
  already exists but pins `--cov-fail-under=80`; enabling it as a merge
  gate requires first measuring baseline and dropping the bar to
  `baseline + 5%`. Cost: CI minutes + one-time coverage audit.
  Mitigation today: pre-push `pnpm type-check && pnpm lint && pnpm test`
  and `uv run pytest tests/` locally.
- **EventNotifier full-suite coverage** — expand
  `tests/test_event_notifier.py` to every `notify_*` helper (reservations,
  instructors, memberships, admin alerts). Currently only the email-path
  primitives + `notify_portal_credentials` are covered because those are
  the ones that keep breaking. Cost: ~2–3 h.
  Mitigation today: the 13 existing tests cover every call-site's shared
  send path, so regressions in primitives are caught.
- **follow-redirects CVE tracking** — axios 1.15.2 pins
  `follow-redirects@1.15.11`, which is exactly the affected version of
  GHSA-cxjh-pqwp-8mfp. Upstream hasn't published a fix yet. Cost: zero
  until upstream ships; then one `npm update` cycle.
  Mitigation today: follow-redirects runs inside `axios` on the server
  side; our browser bundle doesn't use it, so the blast radius is the
  Node-side axios import in the Vite dev server — not production.

---

## Next 30 Days — Quick Wins

### 1. Security Hardening
- [x] Add API Gateway rate limiting (throttling) — 20 rps / 50 burst in v1.5.6
- [x] Update portal npm dependencies (Amplify vulnerabilities) — postcss
      8.5.10, axios 1.15.2 in v1.5.6
- [ ] Review IAM permissions for least-privilege

### 2. Developer Experience
- [ ] Add pre-commit hooks for lint/type checks
- [ ] Create `npm run validate` script that runs all checks
- [x] ~~Add GitHub Actions workflow for CI~~ — workflow exists; gate
      enforcement deferred (see above)

### 3. Performance
- [x] Implement route-based code splitting in frontend — TanStack Router
      autoCodeSplitting + dynamic exportReports in v1.5.6 (bundle −69%)
- [ ] Add lazy loading for heavy components
- [ ] Review Lambda cold start optimization

---

## Next 90 Days — Strategic Upgrades

### 1. Staging Environment
- [ ] Create staging CDK stack
- [ ] Set up staging subdomain (staging.fitnessroom.mx)
- [ ] Implement promotion workflow (staging → prod)

### 2. Test Coverage Expansion
- [ ] Add integration tests for all routers
- [ ] Add frontend tests for critical flows
- [ ] Add portal smoke tests
- [ ] Set up test coverage reporting

### 3. Shared Types Package
- [ ] Create `packages/shared-types` workspace
- [ ] Extract common interfaces (Student, Membership, Class)
- [ ] Configure TypeScript project references

### 4. Observability
- [ ] Add CloudWatch dashboards
- [ ] Set up error alerting
- [ ] Implement distributed tracing

---

## Next 6 Months — Scale Improvements

### 1. Server-Side Pagination
- [ ] Implement cursor-based pagination in API
- [ ] Add infinite scroll to frontend lists
- [ ] Optimize DynamoDB queries for large datasets

### 2. WhatsApp Integration (Phase 3)
- [ ] Set up WhatsApp Business API
- [ ] Implement renewal reminders via WhatsApp
- [ ] Add check-in confirmation messages

### 3. Mobile App Foundation
- [ ] Evaluate React Native or native approach
- [ ] Design offline-first architecture
- [ ] Plan push notification infrastructure

### 4. Advanced Reporting
- [ ] Add export to Excel for all reports
- [ ] Implement scheduled report emails
- [ ] Create business intelligence dashboards

---

## Future Vision — World-Class Platform

### Intelligent Operations
- Predictive membership renewal suggestions
- Automated class capacity optimization
- Smart scheduling based on attendance patterns

### Member Experience
- Native iOS/Android apps
- Biometric check-in (face recognition)
- Gamification and loyalty rewards

### Business Growth
- Multi-location support
- White-label solution for other gyms
- Integration marketplace (payment processors, marketing tools)

### Technical Excellence
- Event sourcing for audit trail
- CQRS for read/write optimization
- GraphQL API layer

---

## Priority Matrix

| Initiative | Impact | Effort | Priority |
|------------|--------|--------|----------|
| API rate limiting | High | Low | P0 |
| Staging environment | High | Medium | P1 |
| Route code splitting | Medium | Low | P1 |
| Test coverage | High | High | P2 |
| WhatsApp integration | High | High | P2 |
| Shared types package | Medium | Medium | P3 |
| Mobile app | Very High | Very High | P3 |

---

*Last updated: 2026-04-24*
