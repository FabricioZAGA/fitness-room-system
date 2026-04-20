---
description: Deploy the Fitness Room System to AWS (infrastructure, backend, or frontend)
---

## Deploy Fitness Room System to AWS

Always use AWS profile `salle-cajas` and account `948999370306`.
Production-only deployment — no dev/staging environments.

### 1. Verify AWS credentials

// turbo
Run this to confirm the correct profile is active:
```bash
aws sts get-caller-identity --profile salle-cajas
```
Expected: `Account: 948999370306`

### 2. First-time bootstrap (run only once)

```bash
AWS_PROFILE=salle-cajas npx aws-cdk bootstrap aws://948999370306/us-west-2
```

### 3. Deploy all infrastructure (first time or manual)

```bash
cd infrastructure/cdk
AWS_PROFILE=salle-cajas npx aws-cdk deploy --all --require-approval broadening
```

### 4. Release via pipeline (normal workflow)

Tag a version and release:
```bash
make tag V=1.2.3
make release
```

Then approve the deployment in the AWS CodePipeline console.

### 5. Verify deployment

// turbo
Check stacks are deployed:
```bash
aws cloudformation list-stacks --profile salle-cajas --query "StackSummaries[?contains(StackName, 'FitnessRoom') && StackStatus!='DELETE_COMPLETE'].{Name:StackName,Status:StackStatus}" --output table
```

### 6. Get API URL after deploy

```bash
aws cloudformation describe-stacks \
  --stack-name FitnessRoomApiStack-prod \
  --profile salle-cajas \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text
```

### Notes

- Only production environment exists — saves ~66% on AWS costs
- DynamoDB tables use RETAIN — data is NOT deleted on stack destroy
- Always run `make lint` and `make test` before releasing
- Pipeline has a manual approval step before build/deploy
- All config is in `infrastructure/cdk/cdk.json` context
