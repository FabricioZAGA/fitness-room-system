# Troubleshooting Guide — Fitness Room System

Common issues and their solutions.

---

## Development Environment

### Backend won't start

**Symptom**: `uvicorn` fails with import errors

**Solutions**:
1. Ensure virtual environment is active: `cd backend && uv sync`
2. Check `.env` file exists: `cp .env.example .env`
3. Verify Python version: `python --version` (needs 3.12+)

### Frontend dev server crashes

**Symptom**: Vite crashes or shows white screen

**Solutions**:
1. Clear node_modules: `rm -rf node_modules && pnpm install`
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Check `.env` file has all required vars

### Portal login fails locally

**Symptom**: "Network Error" or CORS issues

**Solutions**:
1. Ensure backend is running on port 8000
2. Check `VITE_API_BASE_URL` in portal `.env`
3. Verify Cognito User Pool ID is correct

---

## Type Errors

### mypy errors after pulling changes

**Solution**:
```bash
cd backend
uv run mypy src/
# Fix any errors shown
```

### TypeScript errors in frontend

**Solution**:
```bash
cd frontend
npx tsc --noEmit
# Check for missing types or interface changes
```

---

## Test Failures

### Backend tests fail with "StudentStatus has no attribute"

**Cause**: Test fixtures use outdated enum values

**Solution**: Update test files to use current enum values (`ACTIVE`, `INACTIVE`, `SUSPENDED`)

### Tests fail with DynamoDB connection errors

**Cause**: Tests may be trying to hit real DynamoDB

**Solution**: Ensure tests mock the repositories properly

---

## Deployment Issues

### CDK deploy fails

**Symptom**: "No credentials" or IAM errors

**Solutions**:
1. Verify AWS profile: `aws sts get-caller-identity --profile salle-cajas`
2. Check credentials not expired
3. Ensure correct region: `us-west-2`

### CloudFront still serving old content

**Solutions**:
1. Create invalidation: `aws cloudfront create-invalidation --distribution-id XXXX --paths "/*"`
2. Wait 5-10 minutes for propagation
3. Check browser dev tools for cached responses

### Lambda cold starts are slow

**Causes**:
- Large deployment package
- Many imports at module level

**Solutions**:
- Lazy load heavy imports
- Review Lambda configuration in CDK

---

## Production Issues

### Check-in not working

**Debug steps**:
1. Check API health: `curl https://api.fitnessroom.mx/health`
2. Check student exists and is active
3. Check membership is not expired
4. Review CloudWatch logs for errors

### Email notifications not sending

**Debug steps**:
1. Verify SES is configured in `us-west-2`
2. Check sender email is verified
3. Review SES sending statistics
4. Check Lambda logs for SES errors

### Portal shows blank page

**Debug steps**:
1. Check browser console for errors
2. Verify CloudFront is serving latest build
3. Check Amplify configuration in portal

---

## Database Issues

### DynamoDB throttling

**Symptom**: "ProvisionedThroughputExceeded" errors

**Solutions**:
1. Table uses PAY_PER_REQUEST, so this shouldn't happen
2. Check for runaway queries or loops
3. Review CloudWatch metrics

### Data inconsistency

**Debug steps**:
1. Check DynamoDB directly via AWS Console
2. Verify GSI indexes are correct
3. Review recent code changes to repositories

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid/expired JWT | Re-login, check Cognito |
| `403 Forbidden` | Missing permissions | Check user groups |
| `404 Not Found` | Resource doesn't exist | Verify ID, check table |
| `409 Conflict` | Duplicate email/phone | Use unique values |
| `422 Validation Error` | Invalid request body | Check field requirements |
| `500 Internal Server Error` | Backend exception | Check CloudWatch logs |

---

## Getting Help

1. Check CloudWatch Logs for detailed error messages
2. Review recent git commits for breaking changes
3. Search existing issues in the repo
4. Contact: [project maintainer]

---

*Last updated: 2026-04-24*
