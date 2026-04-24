# Roadmap — Fitness Room System

Future improvements prioritized by impact and effort.

---

## Next 30 Days — Quick Wins

### 1. Security Hardening
- [ ] Add API Gateway rate limiting (WAF or throttling)
- [ ] Update portal npm dependencies (Amplify vulnerabilities)
- [ ] Review IAM permissions for least-privilege

### 2. Developer Experience
- [ ] Add pre-commit hooks for lint/type checks
- [ ] Create `npm run validate` script that runs all checks
- [ ] Add GitHub Actions workflow for CI

### 3. Performance
- [ ] Implement route-based code splitting in frontend
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
