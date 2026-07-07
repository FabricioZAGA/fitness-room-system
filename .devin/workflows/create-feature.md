---
description: Create a new feature following Fitness Room architecture patterns
---

## Create New Feature (Full Stack)

Use this workflow when adding a new module or feature to the Fitness Room System.

### 1. Create a new branch
```bash
git checkout -b fzacarias/fire-XXXX/short-description
```
Replace `XXXX` with the issue/ticket number.

### 2. Backend — Add new module

**2a. Create the Pydantic model** in `backend/src/models/your_module.py`:
- Input schemas (Create, Update)
- Response schemas (single, list)
- DynamoDB item schema

**2b. Create the repository** in `backend/src/repositories/your_module_repository.py`:
- Extend `DynamoRepository`
- Implement access patterns (get, list, create, update, delete)
- Document each method with access pattern description

**2c. Create the service** in `backend/src/services/your_module_service.py`:
- Business logic only (no DynamoDB calls directly)
- Call repository methods
- Handle domain exceptions

**2d. Create the router** in `backend/src/routers/your_module.py`:
- FastAPI router with prefix
- All endpoints require auth (use `get_current_user` dependency)
- Full OpenAPI docstrings (summary, description, response_model)
- Add to `backend/src/main.py`

**2e. Write tests** in `backend/tests/test_your_module.py`:
- Test each endpoint
- Mock DynamoDB calls
- Test happy path + error cases

### 3. Frontend — Add new module

**3a. Create TypeScript types** in `frontend/src/types/yourModule.ts`:
- Mirror backend Pydantic models
- Use strict types, no `any`

**3b. Create API service** in `frontend/src/services/yourModuleService.ts`:
- API calls using `apiClient`
- Typed request/response

**3c. Create TanStack Query hooks** in `frontend/src/hooks/useYourModule.ts`:
- `useQuery` for reads
- `useMutation` for writes
- Handle loading/error states

**3d. Create page route** in `frontend/src/routes/your-module/`:
- `index.tsx` — list page
- `$id.tsx` — detail/edit page
- `new.tsx` — create page

**3e. Create components** in `frontend/src/components/shared/`:
- Reusable components for this module
- Fully typed props

### 4. Update documentation
- Add access patterns to `docs/architecture/database-design.md`
- Update `docs/development/getting-started.md` if needed
- Add API endpoints to relevant docs

### 5. Lint, test, commit
```bash
make lint
make test
git add .
git commit -m "feat(your-module): add your description"
```

### 6. Create Pull Request
Use the PR template in `.github/PULL_REQUEST_TEMPLATE.md`.
