"""Pytest configuration and shared fixtures for Fitness Room backend tests."""

import os
from collections.abc import Generator
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DYNAMODB_TABLE_NAME", "fitness-room-test")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("COGNITO_USER_POOL_ID", "us-east-1_TEST")
os.environ.setdefault("COGNITO_CLIENT_ID", "test-client-id")
os.environ.setdefault("POWERTOOLS_TRACE_DISABLED", "true")
os.environ.setdefault("POWERTOOLS_DEV", "true")
os.environ.setdefault("LOG_LEVEL", "WARNING")

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
