#!/usr/bin/env bash
# Bootstrap script for Fitness Room System AWS CDK
# Run this ONCE per AWS account/region before deploying.
#
# Usage: ./scripts/bootstrap.sh [dev|staging|prod]

set -euo pipefail

ENV=${1:-dev}
AWS_PROFILE="salle-cajas"
AWS_ACCOUNT_ID="948999370306"
AWS_REGION="us-east-1"

echo "🚀 Bootstrapping CDK for Fitness Room System"
echo "   Account : $AWS_ACCOUNT_ID"
echo "   Region  : $AWS_REGION"
echo "   Env     : $ENV"
echo "   Profile : $AWS_PROFILE"
echo ""

aws sts get-caller-identity --profile "$AWS_PROFILE" --output table

echo ""
echo "🔧 Running CDK bootstrap..."
cdk bootstrap \
  --profile "$AWS_PROFILE" \
  "aws://$AWS_ACCOUNT_ID/$AWS_REGION"

echo ""
echo "✅ Bootstrap complete! You can now deploy with:"
echo "   make deploy ENV=$ENV"
