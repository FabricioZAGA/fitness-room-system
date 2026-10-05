"""Tests for the Classes API endpoints."""

from datetime import UTC, date, datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from src.models.class_model import ClassDynamoItem, ClassResponse, ClassType


def make_class_response(overrides: dict | None = None) -> ClassResponse:
    """Build a mock ClassResponse for testing."""
    data = {
        "class_id": str(uuid4()),
        "class_type": ClassType.ZUMBA,
        "instructor_name": "Carlos López",
        "class_date": date.today(),
        "start_time": "07:00:00",
        "duration_minutes": 60,
        "capacity": 15,
        "reservations_count": 0,
        "waitlist_count": 0,
        "available_spots": 15,
        "location": "Sala A",
        "description": None,
        "class_link": None,
        "is_cancelled": False,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    if overrides:
        data.update(overrides)
    return ClassResponse(**data)


SAMPLE_CLASS_CREATE = {
    "class_type": "zumba",
    "instructor_name": "Carlos López",
    "class_date": str(date.today()),
    "start_time": "07:00:00",
    "duration_minutes": 60,
    "capacity": 15,
    "location": "Sala A",
}


class TestCreateClass:
    """Tests for POST /api/v1/classes."""

    def test_create_class_success(self, client: TestClient) -> None:
        """Should create a class and return 201."""
        mock_response = make_class_response()
        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.create_class.return_value = mock_response
            mock_svc_cls.return_value = mock_svc

            response = client.post("/api/v1/classes", json=SAMPLE_CLASS_CREATE)

        assert response.status_code == 201
        body = response.json()
        assert "class_id" in body
        assert body["class_type"] == "zumba"
        assert body["instructor_name"] == "Carlos López"

    def test_create_class_missing_required_fields(self, client: TestClient) -> None:
        """Should return 422 when required fields are missing."""
        response = client.post(
            "/api/v1/classes",
            json={"class_type": "zumba"},
        )
        assert response.status_code == 422

    def test_create_class_invalid_type(self, client: TestClient) -> None:
        """Should return 422 for unknown class type."""
        payload = {**SAMPLE_CLASS_CREATE, "class_type": "kickboxing"}
        response = client.post("/api/v1/classes", json=payload)
        assert response.status_code == 422


class TestGetClass:
    """Tests for GET /api/v1/classes/{class_id}."""

    def test_get_class_success(self, client: TestClient) -> None:
        """Should return the class when found."""
        class_id = str(uuid4())
        mock_response = make_class_response({"class_id": class_id})
        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.get_class.return_value = mock_response
            mock_svc_cls.return_value = mock_svc

            response = client.get(f"/api/v1/classes/{class_id}")

        assert response.status_code == 200
        assert response.json()["class_id"] == class_id

    def test_get_class_not_found(self, client: TestClient) -> None:
        """Should return 404 for a non-existent class."""
        from src.utils.exceptions import ResourceNotFoundException

        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.get_class.side_effect = ResourceNotFoundException("Class not found")
            mock_svc_cls.return_value = mock_svc

            response = client.get(f"/api/v1/classes/{uuid4()}")

        assert response.status_code == 404


class TestListClasses:
    """Tests for GET /api/v1/classes."""

    def test_list_classes_success(self, client: TestClient) -> None:
        """Should return paginated class list."""
        classes = [make_class_response() for _ in range(4)]
        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.list_classes.return_value = (classes, None)
            mock_svc_cls.return_value = mock_svc

            response = client.get("/api/v1/classes")

        assert response.status_code == 200
        body = response.json()
        assert len(body["items"]) == 4
        assert body["has_more"] is False

    def test_list_classes_upcoming_only(self, client: TestClient) -> None:
        """Should pass upcoming_only flag to service."""
        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.list_classes.return_value = ([], None)
            mock_svc_cls.return_value = mock_svc

            response = client.get("/api/v1/classes?upcoming_only=true")

        assert response.status_code == 200
        mock_svc.list_classes.assert_called_once()
        kwargs = mock_svc.list_classes.call_args
        assert kwargs is not None


class TestUpdateClass:
    """Tests for PATCH /api/v1/classes/{class_id}."""

    def test_update_class_success(self, client: TestClient) -> None:
        """Should update and return the class."""
        class_id = str(uuid4())
        updated = make_class_response({"class_id": class_id, "capacity": 20})
        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.update_class.return_value = updated
            mock_svc_cls.return_value = mock_svc

            response = client.patch(
                f"/api/v1/classes/{class_id}",
                json={"capacity": 20},
            )

        assert response.status_code == 200
        assert response.json()["capacity"] == 20


def make_class_item(**overrides: object) -> ClassDynamoItem:
    """Build a ClassDynamoItem for service/repository tests."""

    data: dict[str, object] = {
        "PK": "CLASS#c1",
        "SK": "PROFILE",
        "GSI1PK": "CLASSES",
        "GSI1SK": "DATE#2026-10-05#CLASS#c1",
        "GSI2PK": "INSTRUCTOR#carlos_lópez",
        "GSI2SK": "DATE#2026-10-05#CLASS#c1",
        "class_id": "c1",
        "class_type": "zumba",
        "instructor_name": "Carlos López",
        "class_date": "2026-10-05",
        "start_time": "07:00:00",
        "duration_minutes": 60,
        "capacity": 15,
        "reservations_count": 4,
        "location": "Sala A",
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    data.update(overrides)
    return ClassDynamoItem.model_validate(data)


class TestEditClassService:
    """Editing a class keeps enrolled students and keys consistent."""

    def test_move_date_syncs_reservations(self) -> None:
        from src.models.class_model import ClassUpdate
        from src.services.class_service import ClassService

        repo, res_repo = MagicMock(), MagicMock()
        repo.get_by_id.return_value = make_class_item()
        repo.update.return_value = make_class_item(class_date="2026-10-07")
        res_repo.sync_class_date.return_value = 4

        svc = ClassService(repository=repo, reservation_repository=res_repo)
        result = svc.update_class("c1", ClassUpdate(class_date=date(2026, 10, 7)))

        res_repo.sync_class_date.assert_called_once_with("c1", "2026-10-07")
        assert str(result.class_date) == "2026-10-07"

    def test_same_date_does_not_touch_reservations(self) -> None:
        from src.models.class_model import ClassUpdate
        from src.services.class_service import ClassService

        repo, res_repo = MagicMock(), MagicMock()
        repo.get_by_id.return_value = make_class_item()
        repo.update.return_value = make_class_item(instructor_name="Ana Ruiz")

        svc = ClassService(repository=repo, reservation_repository=res_repo)
        svc.update_class("c1", ClassUpdate(instructor_name="Ana Ruiz", class_type="yoga"))

        res_repo.sync_class_date.assert_not_called()

    def test_capacity_below_reservations_rejected(self) -> None:
        from fastapi import HTTPException

        from src.models.class_model import ClassUpdate
        from src.services.class_service import ClassService

        repo = MagicMock()
        repo.get_by_id.return_value = make_class_item(reservations_count=10)
        svc = ClassService(repository=repo, reservation_repository=MagicMock())
        try:
            svc.update_class("c1", ClassUpdate(capacity=5))
            raise AssertionError("expected HTTPException")
        except HTTPException as exc:
            assert exc.status_code == 400
        repo.update.assert_not_called()

    def test_repository_rewrites_gsi_keys(self) -> None:
        from src.models.class_model import ClassUpdate
        from src.repositories.class_repository import ClassRepository

        repo = ClassRepository.__new__(ClassRepository)
        current = make_class_item()
        repo.get_by_id = MagicMock(return_value=current)  # type: ignore[method-assign]
        repo.update_item = MagicMock(  # type: ignore[method-assign]
            side_effect=lambda _pk, _sk, updates: {**current.model_dump(), **updates}
        )

        repo.update(
            "c1", ClassUpdate(class_date=date(2026, 10, 7), instructor_name="Ana Ruiz")
        )

        sent = repo.update_item.call_args.args[2]
        assert sent["GSI1SK"] == "DATE#2026-10-07#CLASS#c1"
        assert sent["GSI2SK"] == "DATE#2026-10-07#CLASS#c1"
        assert sent["GSI2PK"] == "INSTRUCTOR#ana_ruiz"


class TestCancelClass:
    """Tests for POST /api/v1/classes/{class_id}/cancel."""

    def test_cancel_class_success(self, client: TestClient) -> None:
        """Should cancel the class and return 200."""
        class_id = str(uuid4())
        cancelled = make_class_response({"class_id": class_id, "is_cancelled": True})
        with patch("src.routers.classes.ClassService") as mock_svc_cls:
            mock_svc = MagicMock()
            mock_svc.cancel_class.return_value = cancelled
            mock_svc_cls.return_value = mock_svc

            response = client.post(f"/api/v1/classes/{class_id}/cancel")

        assert response.status_code == 200
        assert response.json()["is_cancelled"] is True
