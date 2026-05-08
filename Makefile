.PHONY: help install dev dev-backend dev-frontend dev-portal test lint format deploy deploy-infra deploy-backend deploy-frontend deploy-portal clean release tag version create-admin

# ── Configuration ──────────────────────────────────────────────────────────────
AWS_PROFILE     ?= salle-cajas
AWS_ACCOUNT_ID  ?= 948999370306
AWS_REGION      ?= us-west-2
ENV             ?= prod
BACKEND_DIR     := backend
FRONTEND_DIR    := frontend
PORTAL_DIR      := portal
INFRA_DIR       := infrastructure/cdk
SOURCE_BUCKET   := fitness-room-pipeline-source-$(AWS_ACCOUNT_ID)
SOURCE_KEY      := fitness-room-source.zip
VERSION         := $(shell cat VERSION 2>/dev/null || echo "0.0.0")

# ── Help ───────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  FITNESS ROOM SYSTEM — Available Commands"
	@echo "  ──────────────────────────────────────────────────────"
	@echo "  install           Install all dependencies (backend + frontend + portal + infra)"
	@echo "  dev               Start backend + frontend in development mode"
	@echo "  dev-backend       Start backend locally (uvicorn)"
	@echo "  dev-frontend      Start frontend locally (vite)"
	@echo "  dev-portal        Start portal locally (vite)"
	@echo "  test              Run all tests"
	@echo "  test-backend      Run backend tests (pytest)"
	@echo "  test-frontend     Run frontend tests (vitest)"
	@echo "  lint              Lint backend + frontend"
	@echo "  format            Format backend + frontend code"
	@echo "  deploy            Deploy everything to AWS (infra + backend + frontend)"
	@echo "  deploy-infra      Deploy CDK infrastructure stacks"
	@echo "  deploy-backend    Deploy Lambda functions"
	@echo "  deploy-frontend   Deploy frontend to S3 + CloudFront invalidation"
	@echo "  deploy-portal     Deploy student portal to S3 + CloudFront invalidation"
	@echo "  clean             Remove all build artifacts"
	@echo ""
	@echo "  ── Release / CI/CD ──────────────────────────────────────"
	@echo "  tag V=x.y.z       Create git tag and update VERSION file"
	@echo "  release           Package repo + upload to S3 → triggers CodePipeline"
	@echo "  version           Show current version"
	@echo "  deploy-sites      Build + sync frontend & portal to S3 + CloudFront"
	@echo ""
	@echo "  ── Admin ────────────────────────────────────────────────"
	@echo "  create-admin EMAIL=x NAME=y  Create Cognito admin user + send welcome email"
	@echo ""

# ── Install ────────────────────────────────────────────────────────────────────
install: install-backend install-frontend install-portal install-infra
	@echo "✅ All dependencies installed"

install-backend:
	@echo "📦 Installing backend dependencies..."
	@if [ ! -d "$(BACKEND_DIR)/.venv" ]; then python3 -m venv $(BACKEND_DIR)/.venv; fi
	$(BACKEND_DIR)/.venv/bin/pip install -r $(BACKEND_DIR)/requirements.txt \
		"pytest>=8.3.0" "pytest-cov>=5.0.0" "pytest-asyncio>=0.24.0" "pytest-mock>=3.14.0" \
		"moto[dynamodb]>=5.0.0" "ruff>=0.8.0" "mypy>=1.13.0" \
		"boto3-stubs[dynamodb,cognito-idp]>=1.35.0" "types-python-jose>=3.3.0" \
		"uvicorn[standard]>=0.32.0" "pydantic[email]>=2.10.0" "aws-xray-sdk>=2.14.0" \
		--trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -q

install-frontend:
	@echo "📦 Installing frontend dependencies..."
	COREPACK_ENABLE_STRICT=0 cd $(FRONTEND_DIR) && pnpm install

install-portal:
	@echo "📦 Installing portal dependencies..."
	cd $(PORTAL_DIR) && npm install

install-infra:
	@echo "📦 Installing CDK dependencies..."
	@if [ ! -d "$(INFRA_DIR)/.venv" ]; then python3 -m venv $(INFRA_DIR)/.venv; fi
	$(INFRA_DIR)/.venv/bin/pip install -r $(INFRA_DIR)/requirements.txt \
		--trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -q

# ── Development ────────────────────────────────────────────────────────────────
dev:
	@echo "🚀 Starting dev servers..."
	@make -j2 dev-backend dev-frontend dev-portal

dev-backend:
	@echo "🐍 Starting backend..."
	cd $(BACKEND_DIR) && .venv/bin/uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo "⚛️  Starting frontend..."
	COREPACK_ENABLE_STRICT=0 cd $(FRONTEND_DIR) && pnpm dev

dev-portal:
	@echo "🎯 Starting portal..."
	cd $(PORTAL_DIR) && npm run dev

# ── Tests ──────────────────────────────────────────────────────────────────────
test: test-backend test-frontend

test-backend:
	@echo "🧪 Running backend tests..."
	cd $(BACKEND_DIR) && .venv/bin/python -m pytest tests/ -v --cov=src --cov-report=term-missing

test-frontend:
	@echo "🧪 Running frontend tests..."
	COREPACK_ENABLE_STRICT=0 cd $(FRONTEND_DIR) && pnpm test

# ── Lint & Format ──────────────────────────────────────────────────────────────
lint: lint-backend lint-frontend

lint-backend:
	@echo "🔍 Linting backend..."
	cd $(BACKEND_DIR) && .venv/bin/ruff check src/ tests/
	cd $(BACKEND_DIR) && .venv/bin/mypy src/

lint-frontend:
	@echo "🔍 Linting frontend..."
	cd $(FRONTEND_DIR) && pnpm lint

format: format-backend format-frontend

format-backend:
	@echo "✨ Formatting backend..."
	cd $(BACKEND_DIR) && .venv/bin/ruff format src/ tests/
	cd $(BACKEND_DIR) && .venv/bin/ruff check --fix src/ tests/

format-frontend:
	@echo "✨ Formatting frontend..."
	cd $(FRONTEND_DIR) && pnpm format

# ── Build ──────────────────────────────────────────────────────────────────────
build-frontend:
	@echo "🏗️  Building frontend..."
	cd $(FRONTEND_DIR) && pnpm build

build-portal:
	@echo "🏗️  Building portal..."
	cd $(PORTAL_DIR) && npm run build

build-backend:
	@echo "🏗️  Packaging backend Lambda..."
	cd $(BACKEND_DIR) && uv run python -m build

# ── Deploy ─────────────────────────────────────────────────────────────────────
deploy: deploy-infra deploy-backend deploy-frontend
	@echo "🎉 Full deployment complete to ENV=$(ENV)"

deploy-infra:
	@echo "☁️  Deploying CDK infrastructure (ENV=$(ENV))..."
	cd $(INFRA_DIR) && cdk deploy --all \
		--context env=$(ENV) \
		--profile $(AWS_PROFILE) \
		--require-approval never

deploy-backend:
	@echo "🚀 Deploying backend Lambda (ENV=$(ENV))..."
	cd $(INFRA_DIR) && cdk deploy FitnessRoomApiStack-$(ENV) \
		--context env=$(ENV) \
		--profile $(AWS_PROFILE) \
		--require-approval never

deploy-frontend:
	@echo "🚀 Deploying frontend (ENV=$(ENV))..."
	cd $(FRONTEND_DIR) && pnpm build
	@BUCKET=$$(aws cloudformation describe-stacks \
		--stack-name FitnessRoomHostingStack-$(ENV) \
		--profile $(AWS_PROFILE) \
		--query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
		--output text); \
	aws s3 sync dist/ s3://$$BUCKET/ --delete --profile $(AWS_PROFILE)
	@DIST_ID=$$(aws cloudformation describe-stacks \
		--stack-name FitnessRoomHostingStack-$(ENV) \
		--profile $(AWS_PROFILE) \
		--query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
		--output text); \
	aws cloudfront create-invalidation --distribution-id $$DIST_ID --paths "/*" --profile $(AWS_PROFILE)
	@echo "✅ Frontend deployed!"

deploy-portal:
	@echo "🚀 Deploying portal (ENV=$(ENV))..."
	cd $(PORTAL_DIR) && npm run build
	@BUCKET=$$(aws cloudformation describe-stacks \
		--stack-name FitnessRoomPortalHostingStack-$(ENV) \
		--profile $(AWS_PROFILE) \
		--query "Stacks[0].Outputs[?OutputKey=='PortalBucketName'].OutputValue" \
		--output text); \
	aws s3 sync dist/ s3://$$BUCKET/ --delete --profile $(AWS_PROFILE)
	@DIST_ID=$$(aws cloudformation describe-stacks \
		--stack-name FitnessRoomPortalHostingStack-$(ENV) \
		--profile $(AWS_PROFILE) \
		--query "Stacks[0].Outputs[?OutputKey=='PortalCloudFrontDistributionId'].OutputValue" \
		--output text); \
	aws cloudfront create-invalidation --distribution-id $$DIST_ID --paths "/*" --profile $(AWS_PROFILE)
	@echo "✅ Portal deployed!"

# ── CDK Bootstrap ─────────────────────────────────────────────────────────────
bootstrap:
	@echo "🔧 Bootstrapping CDK for AWS account $(AWS_ACCOUNT_ID) in $(AWS_REGION)..."
	cdk bootstrap --profile $(AWS_PROFILE) aws://$(AWS_ACCOUNT_ID)/$(AWS_REGION)

# ── Clean ──────────────────────────────────────────────────────────────────────
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf $(FRONTEND_DIR)/dist
	rm -rf $(FRONTEND_DIR)/node_modules/.vite
	rm -rf $(PORTAL_DIR)/dist
	rm -rf $(PORTAL_DIR)/node_modules/.vite
	rm -rf $(INFRA_DIR)/cdk.out
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	@echo "✅ Cleaned!"

# ── Git helpers ────────────────────────────────────────────────────────────────
.PHONY: status log

status:
	git status

log:
	git log --oneline -20

# ── Release / CI/CD ──────────────────────────────────────────────────────────

version:
	@echo "Current version: $(VERSION)"

tag:
	@if [ -z "$(V)" ]; then echo "Usage: make tag V=1.2.3"; exit 1; fi
	@echo "$(V)" > VERSION
	git add VERSION
	git commit -m "chore: bump version to $(V)"
	git tag -a "v$(V)" -m "Release v$(V)"
	@echo "✅ Tagged v$(V) — run 'make release' to deploy"

release:
	@echo "📦 Packaging version $(VERSION)..."
	@echo "$(VERSION)" > VERSION
	git archive --format=zip --prefix=fitness-room/ -o /tmp/$(SOURCE_KEY) HEAD
	@echo "📤 Uploading to s3://$(SOURCE_BUCKET)/$(SOURCE_KEY)..."
	AWS_PROFILE=$(AWS_PROFILE) aws s3 cp /tmp/$(SOURCE_KEY) s3://$(SOURCE_BUCKET)/$(SOURCE_KEY)
	@echo "✅ Release $(VERSION) uploaded — CodePipeline will start automatically"
	@echo "   View pipeline: https://$(AWS_REGION).console.aws.amazon.com/codesuite/codepipeline/pipelines/fitness-room-$(ENV)/view"

# ── Deploy sites (frontend + portal) ─────────────────────────────────────────

FRONTEND_BUCKET  := fitness-room-frontend-$(ENV)-$(AWS_ACCOUNT_ID)
PORTAL_BUCKET    := fitness-room-portal-$(ENV)-$(AWS_ACCOUNT_ID)
FRONTEND_DIST_ID := $(shell AWS_PROFILE=$(AWS_PROFILE) aws cloudformation describe-stacks --stack-name FitnessRoomHostingStack-$(ENV) --region $(AWS_REGION) --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text 2>/dev/null)
PORTAL_DIST_ID   := $(shell AWS_PROFILE=$(AWS_PROFILE) aws cloudformation describe-stacks --stack-name FitnessRoomPortalHostingStack-$(ENV) --region $(AWS_REGION) --query "Stacks[0].Outputs[?OutputKey=='PortalCloudFrontDistributionId'].OutputValue" --output text 2>/dev/null)

deploy-sites: deploy-frontend deploy-portal
	@echo "✅ Both sites deployed"

deploy-frontend:
	@echo "🔨 Building frontend..."
	cd $(FRONTEND_DIR) && npm run build
	@echo "📤 Syncing to s3://$(FRONTEND_BUCKET)..."
	AWS_PROFILE=$(AWS_PROFILE) aws s3 sync $(FRONTEND_DIR)/dist/ s3://$(FRONTEND_BUCKET)/ --delete \
		--cache-control "public, max-age=31536000, immutable" \
		--exclude "index.html" --exclude "*.json" --region $(AWS_REGION)
	AWS_PROFILE=$(AWS_PROFILE) aws s3 cp $(FRONTEND_DIR)/dist/index.html s3://$(FRONTEND_BUCKET)/index.html \
		--cache-control "no-cache, no-store, must-revalidate" --region $(AWS_REGION)
	@echo "🔄 Invalidating CloudFront $(FRONTEND_DIST_ID)..."
	AWS_PROFILE=$(AWS_PROFILE) aws cloudfront create-invalidation --distribution-id $(FRONTEND_DIST_ID) --paths "/*"
	@echo "✅ Frontend deployed"

deploy-portal:
	@echo "🔨 Building portal..."
	cd $(PORTAL_DIR) && npm run build
	@echo "📤 Syncing to s3://$(PORTAL_BUCKET)..."
	AWS_PROFILE=$(AWS_PROFILE) aws s3 sync $(PORTAL_DIR)/dist/ s3://$(PORTAL_BUCKET)/ --delete \
		--cache-control "public, max-age=31536000, immutable" \
		--exclude "index.html" --exclude "*.json" --region $(AWS_REGION)
	AWS_PROFILE=$(AWS_PROFILE) aws s3 cp $(PORTAL_DIR)/dist/index.html s3://$(PORTAL_BUCKET)/index.html \
		--cache-control "no-cache, no-store, must-revalidate" --region $(AWS_REGION)
	@echo "🔄 Invalidating CloudFront $(PORTAL_DIST_ID)..."
	AWS_PROFILE=$(AWS_PROFILE) aws cloudfront create-invalidation --distribution-id $(PORTAL_DIST_ID) --paths "/*"
	@echo "✅ Portal deployed"

# ── Maintenance mode ─────────────────────────────────────────────────────────

maintenance-on: ## Activate maintenance page (admin + portal)
	@./scripts/maintenance.sh on

maintenance-off: ## Restore live sites (admin + portal)
	@./scripts/maintenance.sh off

# ── Admin user management ─────────────────────────────────────────────────────

create-admin:
	@if [ -z "$(EMAIL)" ]; then echo "Usage: make create-admin EMAIL=user@example.com NAME='Full Name'"; exit 1; fi
	python3 infrastructure/scripts/create_admin_user.py --email "$(EMAIL)" --name "$(NAME)" --profile $(AWS_PROFILE)
