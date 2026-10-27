"""Pytest configuration and shared fixtures for Fitness Room backend tests."""

import os
from collections.abc import Generator, Iterator
from unittest.mock import MagicMock

import boto3
import pytest
from fastapi.testclient import TestClient
from moto import mock_aws

os.environ.setdefault("DYNAMODB_TABLE_NAME", "fitness-room-test")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("COGNITO_USER_POOL_ID", "us-east-1_TEST")
os.environ.setdefault("COGNITO_CLIENT_ID", "test-client-id")
os.environ.setdefault("POWERTOOLS_TRACE_DISABLED", "true")
os.environ.setdefault("POWERTOOLS_DEV", "true")
os.environ.setdefault("LOG_LEVEL", "WARNING")

from src.config import get_settings
from src.main import app
from src.utils.auth import get_current_user

MOCK_ADMIN_USER = {
    "sub": "test-user-id",
    "email": "admin@fitnessroom.test",
    "cognito:groups": ["admin"],
    "given_name": "Test",
    "family_name": "Admin",
}


def override_get_current_user() -> dict:
    """Override authentication for tests — always returns mock admin user."""
    return MOCK_ADMIN_USER


app.dependency_overrides[get_current_user] = override_get_current_user


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Return a FastAPI test client with auth bypassed."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def mock_student_repo() -> MagicMock:
    """Return a mock StudentRepository."""
    return MagicMock()


@pytest.fixture
def mock_membership_repo() -> MagicMock:
    """Return a mock MembershipRepository."""
    return MagicMock()


@pytest.fixture
def mock_class_repo() -> MagicMock:
    """Return a mock ClassRepository."""
    return MagicMock()


@pytest.fixture
def mock_reservation_repo() -> MagicMock:
    """Return a mock ReservationRepository."""
    return MagicMock()


@pytest.fixture
def sample_student_create() -> dict:
    """Return a valid StudentCreate payload."""
    return {
        "first_name": "Ana",
        "last_name": "García",
        "email": "ana.garcia@test.com",
        "phone": "+52 55 1234 5678",
        "status": "active",
    }


@pytest.fixture
def sample_membership_create() -> dict:
    """Return a valid MembershipCreate payload."""
    return {
        "student_id": "test-student-id",
        "membership_type": "monthly",
        "start_date": "2026-01-01",
        "end_date": "2026-01-31",
        "price_paid": 599.0,
    }


@pytest.fixture
def sample_class_create() -> dict:
    """Return a valid ClassCreate payload."""
    return {
        "class_type": "zumba",
        "instructor_name": "María López",
        "class_date": "2026-06-15",
        "start_time": "09:00:00",
        "duration_minutes": 60,
        "capacity": 20,
        "location": "Studio A",
    }


# ---------------------------------------------------------------------------
# In-memory DynamoDB (moto) with the production key schema
# ---------------------------------------------------------------------------

TABLE = "fitness-room-test"


def _attr(name: str) -> dict[str, str]:
    return {"AttributeName": name, "AttributeType": "S"}


def _gsi(n: int) -> dict[str, object]:
    return {
        "IndexName": f"GSI{n}",
        "KeySchema": [
            {"AttributeName": f"GSI{n}PK", "KeyType": "HASH"},
            {"AttributeName": f"GSI{n}SK", "KeyType": "RANGE"},
        ],
        "Projection": {"ProjectionType": "ALL"},
    }


@pytest.fixture
def dynamo(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Fresh moto table with the production key schema (PK/SK + GSI1-3)."""
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    monkeypatch.setenv("DYNAMODB_TABLE_NAME", TABLE)
    monkeypatch.setenv("DYNAMODB_ENDPOINT_URL", "")
    get_settings.cache_clear()
    with mock_aws():
        boto3.client("dynamodb", region_name="us-east-1").create_table(
            TableName=TABLE,
            BillingMode="PAY_PER_REQUEST",
            AttributeDefinitions=[
                _attr(a)
                for a in ("PK", "SK", "GSI1PK", "GSI1SK", "GSI2PK", "GSI2SK", "GSI3PK", "GSI3SK")
            ],
            KeySchema=[
                {"AttributeName": "PK", "KeyType": "HASH"},
                {"AttributeName": "SK", "KeyType": "RANGE"},
            ],
            GlobalSecondaryIndexes=[_gsi(1), _gsi(2), _gsi(3)],  # type: ignore[list-item]
        )
        yield
    get_settings.cache_clear()
