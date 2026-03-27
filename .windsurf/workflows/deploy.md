---
description: Deploy the Fitness Room System to AWS (infrastructure, backend, or frontend)
---

## Deploy Fitness Room System to AWS

Always use AWS profile `salle-cajas` and account `948999370306`.

### 1. Verify AWS credentials
// turbo
Run this to confirm the correct profile is active:
```bash
aws sts get-caller-identity --profile salle-cajas
```
Expected: `Account: 948999370306`

### 2. Choose what to deploy

For full deployment (all stacks):
```bash
make deploy ENV=dev
```

For infrastructure only (CDK stacks):
```bash
make deploy-infra ENV=dev
```

For backend only (Lambda):
```bash
make deploy-backend ENV=dev
```

For frontend only (S3 + CloudFront):
```bash
make deploy-frontend ENV=dev
```

### 3. First-time bootstrap (run only once per account/region)
```bash
make bootstrap
```

### 4. Verify deployment

// turbo
Check stacks are deployed:
```bash
aws cloudformation list-stacks --profile salle-cajas --query "StackSummaries[?contains(StackName, 'FitnessRoom') && StackStatus=='CREATE_COMPLETE' || StackStatus=='UPDATE_COMPLETE'].{Name:StackName,Status:StackStatus}" --output table
```

### 5. Get API URL after deploy
```bash
aws cloudformation describe-stacks \
  --stack-name FitnessRoomApiStack-dev \
  --profile salle-cajas \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text
```

### Notes
- ENV can be `dev`, `staging`, or `prod`
- Production deployments require explicit confirmation
- DynamoDB tables use RETAIN in prod — data is NOT deleted on stack destroy
- Always run `make lint` and `make test` before deploying to prod
