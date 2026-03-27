---
trigger: always_on
---

# Fitness Room System — Windsurf AI Rules

## Project Identity
- **Project**: Fitness Room Management System
- **AWS Account**: 948999370306
- **AWS Profile**: `salle-cajas` — ALWAYS use this profile for ALL AWS commands
- **GitHub**: FabricioZAGA (personal — NEVER touch Realtor/work repos)
- **Region**: us-east-1

## Git Conventions
- Branch prefix: `fzacarias/fire-XXXX/short-description`
- Commit style: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`)
- Never push without personal review (`git push` requires explicit user approval)

## Code Quality Standards
- **Backend**: Type hints on ALL functions; Pydantic v2 models for ALL I/O; docstrings on all public functions/classes; 100% typed
- **Frontend**: Strict TypeScript (`strict: true`); NO `any` type allowed; explicit return types on all functions
- **Testing**: Write tests before major features; never delete/weaken tests
- **Linting**: Ruff (Python), ESLint + Prettier (TypeScript) — must pass before commit

## Architecture Rules
- ALL infrastructure is AWS CDK v2 (Python) — NO manual console changes
- ALL API endpoints require Cognito JWT authentication (except `/health`)
- ALL DynamoDB access goes through the repository layer — NO direct boto3 calls from services
- ALL Lambda functions use AWS Lambda Powertools for logging, tracing, metrics
- Secrets go in AWS Secrets Manager or Parameter Store — NEVER hardcoded
- Environment config via `config.py` reading from environment variables

## File Structure Rules
- Backend: follow `routers → services → repositories` layered pattern
- Frontend: follow `routes → components → hooks → services → store` pattern
- New modules must include: router/page, model/type, service, test file, and docs update
- shadcn/ui components go in `frontend/src/components/ui/`
- Business components go in `frontend/src/components/shared/`

## Documentation Rules
- ALWAYS update relevant docs when adding/changing features
- Every API endpoint must have OpenAPI docstring (FastAPI auto-generates Swagger)
- Every new DynamoDB access pattern must be added to `docs/architecture/database-design.md`
- README must stay current with new environment variables or commands

## Development Phases — DO NOT implement future phases without explicit instruction
- **Phase 1** (CURRENT): Students, Memberships, Reservations
- **Phase 2**: Communication (WhatsApp/Email), Reports
- **Phase 3**: Cash Register, Inventory
- **Phase 4**: Rankings, Automation, Extras

## Naming Conventions
- Python: `snake_case` for variables/functions, `PascalCase` for classes
- TypeScript: `camelCase` for variables/functions, `PascalCase` for types/interfaces/components
- DynamoDB keys: `SCREAMING_SNAKE#id` pattern (e.g., `STUDENT#abc123`)
- CDK stacks: `FitnessRoom{Module}Stack-{env}` (e.g., `FitnessRoomApiStack-dev`)

## AWS CDK Rules
- One stack per logical domain (auth, database, api, hosting)
- ALL stacks receive `env_name` as a prop for multi-environment support
- Use removal policy `RETAIN` for databases in prod, `DESTROY` in dev
- Tag ALL resources with `Project: fitness-room`, `Environment: {env}`, `ManagedBy: cdk`
