---
description: Start local development environment for Fitness Room System
---

## Local Development Setup

### 1. Install all dependencies (first time only)
```bash
make install
```

### 2. Set up environment variables
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` with local/dev values. For local dev, you can use DynamoDB Local or real AWS dev table.

### 3. Start backend (FastAPI + uvicorn)
```bash
make dev-backend
```
- API running at: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 4. Start frontend (Vite)
```bash
make dev-frontend
```
- App running at: http://localhost:5173

### 5. Start both together
```bash
make dev
```

### 6. Run tests
```bash
make test-backend     # Python pytest
make test-frontend    # Vitest
make test             # Both
```

### 7. Lint before committing
```bash
make lint
make format
```

### DynamoDB Local (optional for offline development)
Run DynamoDB Local via Docker:
```bash
docker run -d -p 8001:8000 amazon/dynamodb-local
```

Then set `DYNAMODB_ENDPOINT_URL=http://localhost:8001` in `backend/.env`.

### Backend environment variables needed
```
ENVIRONMENT=local
AWS_PROFILE=salle-cajas
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=fitness-room-dev
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
LOG_LEVEL=DEBUG
```
