.PHONY: help install dev dev-backend dev-frontend test lint format deploy deploy-infra deploy-backend deploy-frontend clean

# ── Configuration ──────────────────────────────────────────────────────────────
AWS_PROFILE     ?= salle-cajas
AWS_ACCOUNT_ID  ?= 948999370306
AWS_REGION      ?= us-east-1
ENV             ?= dev
BACKEND_DIR     := backend
FRONTEND_DIR    := frontend
INFRA_DIR       := infrastructure/cdk

# ── Help ───────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  FITNESS ROOM SYSTEM — Available Commands"
	@echo "  ──────────────────────────────────────────────────────"
	@echo "  install           Install all dependencies (backend + frontend + infra)"
	@echo "  dev               Start backend + frontend in development mode"
	@echo "  dev-backend       Start backend locally (uvicorn)"
	@echo "  dev-frontend      Start frontend locally (vite)"
	@echo "  test              Run all tests"
	@echo "  test-backend      Run backend tests (pytest)"
	@echo "  test-frontend     Run frontend tests (vitest)"
	@echo "  lint              Lint backend + frontend"
	@echo "  format            Format backend + frontend code"
	@echo "  deploy ENV=dev    Deploy everything to AWS (infra + backend + frontend)"
	@echo "  deploy-infra      Deploy CDK infrastructure stacks"
	@echo "  deploy-backend    Deploy Lambda functions"
	@echo "  deploy-frontend   Deploy frontend to S3 + CloudFront invalidation"
	@echo "  clean             Remove all build artifacts"
	@echo ""

# ── Install ────────────────────────────────────────────────────────────────────
install: install-backend install-frontend install-infra
	@echo "✅ All dependencies installed"

install-backend:
	@echo "📦 Installing backend dependencies..."
	cd $(BACKEND_DIR) && uv sync --all-extras

install-frontend:
	@echo "📦 Installing frontend dependencies..."
	cd $(FRONTEND_DIR) && pnpm install

install-infra:
	@echo "📦 Installing CDK dependencies..."
	cd $(INFRA_DIR) && pip install -r requirements.txt

# ── Development ────────────────────────────────────────────────────────────────
dev:
	@echo "🚀 Starting dev servers..."
	@make -j2 dev-backend dev-frontend

dev-backend:
	@echo "🐍 Starting backend..."
	cd $(BACKEND_DIR) && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo "⚛️  Starting frontend..."
	cd $(FRONTEND_DIR) && pnpm dev

# ── Tests ──────────────────────────────────────────────────────────────────────
test: test-backend test-frontend

test-backend:
	@echo "🧪 Running backend tests..."
	cd $(BACKEND_DIR) && uv run pytest tests/ -v --cov=src --cov-report=term-missing

test-frontend:
	@echo "🧪 Running frontend tests..."
	cd $(FRONTEND_DIR) && pnpm test

# ── Lint & Format ──────────────────────────────────────────────────────────────
lint: lint-backend lint-frontend

lint-backend:
	@echo "🔍 Linting backend..."
	cd $(BACKEND_DIR) && uv run ruff check src/ tests/
	cd $(BACKEND_DIR) && uv run mypy src/

lint-frontend:
	@echo "🔍 Linting frontend..."
	cd $(FRONTEND_DIR) && pnpm lint

format: format-backend format-frontend

format-backend:
	@echo "✨ Formatting backend..."
	cd $(BACKEND_DIR) && uv run ruff format src/ tests/
	cd $(BACKEND_DIR) && uv run ruff check --fix src/ tests/

format-frontend:
	@echo "✨ Formatting frontend..."
	cd $(FRONTEND_DIR) && pnpm format

# ── Build ──────────────────────────────────────────────────────────────────────
build-frontend:
	@echo "🏗️  Building frontend..."
	cd $(FRONTEND_DIR) && pnpm build

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

# ── CDK Bootstrap ─────────────────────────────────────────────────────────────
bootstrap:
	@echo "🔧 Bootstrapping CDK for AWS account $(AWS_ACCOUNT_ID) in $(AWS_REGION)..."
	cdk bootstrap --profile $(AWS_PROFILE) aws://$(AWS_ACCOUNT_ID)/$(AWS_REGION)

# ── Clean ──────────────────────────────────────────────────────────────────────
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf $(FRONTEND_DIR)/dist
	rm -rf $(FRONTEND_DIR)/node_modules/.vite
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
