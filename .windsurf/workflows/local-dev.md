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

### DynamoDB Local (recommended for offline development)

#### Start DynamoDB Local
```bash
docker run -d --name dynamodb-local -p 8001:8000 amazon/dynamodb-local:latest -jar DynamoDBLocal.jar -inMemory -sharedDb
```

#### Create the local table (run once per container restart)
```bash
backend/.venv/bin/python - <<'EOF'
import boto3
db = boto3.client("dynamodb", endpoint_url="http://localhost:8001", region_name="us-east-1",
    aws_access_key_id="local", aws_secret_access_key="local")
try:
    db.create_table(
        TableName="fitness-room-local",
        AttributeDefinitions=[
            {"AttributeName": "PK", "AttributeType": "S"}, {"AttributeName": "SK", "AttributeType": "S"},
            {"AttributeName": "GSI1PK", "AttributeType": "S"}, {"AttributeName": "GSI1SK", "AttributeType": "S"},
            {"AttributeName": "GSI2PK", "AttributeType": "S"}, {"AttributeName": "GSI2SK", "AttributeType": "S"},
        ],
        KeySchema=[{"AttributeName": "PK", "KeyType": "HASH"}, {"AttributeName": "SK", "KeyType": "RANGE"}],
        GlobalSecondaryIndexes=[
            {"IndexName": "GSI1", "KeySchema": [{"AttributeName": "GSI1PK", "KeyType": "HASH"}, {"AttributeName": "GSI1SK", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}},
            {"IndexName": "GSI2", "KeySchema": [{"AttributeName": "GSI2PK", "KeyType": "HASH"}, {"AttributeName": "GSI2SK", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    print("Table created")
except db.exceptions.ResourceInUseException:
    print("Table already exists")
EOF
```

### Backend .env for local development
```
ENVIRONMENT=local
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=fitness-room-local
DYNAMODB_ENDPOINT_URL=http://localhost:8001
COGNITO_USER_POOL_ID=us-east-1_LOCAL
COGNITO_CLIENT_ID=local-client-id
POWERTOOLS_TRACE_DISABLED=true
POWERTOOLS_DEV=true
LOG_LEVEL=DEBUG
```

### Frontend .env for local development
```
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_ENV=local
VITE_APP_NAME=Fitness Room
```

### Auth bypass in local mode
When `ENVIRONMENT=local`, the backend accepts `Authorization: Bearer local-dev-token`.
The frontend sends this automatically when `VITE_APP_ENV=local`.

To test endpoints manually:
```bash
curl -H "Authorization: Bearer local-dev-token" http://localhost:8000/api/v1/students
```
