"""End-to-end Caja flows through the HTTP API (TestClient + moto DynamoDB).

These exercise the exact requests the admin panel and the portal make, so a
regression in routers, services, repositories or models shows up here:

- a product sold on credit to a student → shows as pending in their account →
  is paid later with balance + card → shows as paid, income lands in Caja;
- a membership paid partly with balance → one account line, no double income;
- "Público general" can pay now but cannot owe or use balance;
- the student sees the same statement in the portal.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.utils.auth import get_current_user

pytestmark = pytest.mark.usefixtures("dynamo")


def _ok(response: Any, code: int = 200) -> dict[str, Any]:
    assert response.status_code == code, response.text
    return response.json()  # type: ignore[no-any-return]


def _student(client: TestClient, name: str = "Ana") -> dict[str, Any]:
    return _ok(
        client.post(
            "/api/v1/students",
            json={
                "first_name": name,
                "last_name": "Flujo",
                "email": f"{name.lower()}.flujo@test.mx",
                "phone": "+52 477 123 4567",
            },
        ),
        201,
    )


def _product(client: TestClient, price: float = 150, stock: int = 10) -> dict[str, Any]:
    return _ok(
        client.post(
            "/api/v1/inventory/products",
            json={"name": "Proteína", "price": price, "stock": stock, "category": "supplement"},
        ),
        201,
    )


def _account(client: TestClient, student_id: str) -> dict[str, Any]:
    return _ok(client.get(f"/api/v1/students/{student_id}/account"))


def _charges(account: dict[str, Any]) -> list[dict[str, Any]]:
    return [e for e in account["entries"] if e["kind"] == "charge"]


class TestProductOnCredit:
    def test_sell_on_credit_then_pay_with_balance_and_card(self, client: TestClient) -> None:
        student = _student(client)
        sid = student["student_id"]
        product = _product(client)

        sale = _ok(
            client.post(
                "/api/v1/inventory/sales",
                json={
                    "product_id": product["product_id"],
                    "quantity": 2,
                    "student_id": sid,
                    "payment_method": "cash",
                    "payment_status": "pending",
                },
            ),
            201,
        )
        assert sale["total_amount"] == 300
        assert _ok(client.get(f"/api/v1/inventory/products/{product['product_id']}"))["stock"] == 8

        # Debt is visible for the student and globally
        debts = _ok(client.get(f"/api/v1/debts/student/{sid}"))
        assert len(debts) == 1
        assert debts[0]["concept_type"] == "product"
        assert debts[0]["description"] == "Venta: Proteína x2"
        assert debts[0]["amount"] == 300
        assert any(
            d["sale_id"] == sale["sale_id"] for d in _ok(client.get("/api/v1/debts/pending"))
        )

        # Account statement: one pending charge, nothing paid yet
        account = _account(client, sid)
        assert account["total_pending"] == 300 and account["pending_count"] == 1
        [entry] = _charges(account)
        assert entry["status"] == "pending"
        assert entry["pending_amount"] == 300
        assert entry["debt_id"] == sale["sale_id"]

        # No income was registered (it is still owed)
        assert _ok(client.get("/api/v1/transactions/open-period"))["grand_total"] == 0

        # Student deposits 100 in cash → shows as a deposit, not a purchase
        _ok(
            client.post(
                f"/api/v1/balance/{sid}/deposit", json={"amount": 100, "payment_method": "cash"}
            ),
            200,
        )
        account = _account(client, sid)
        assert account["current_balance"] == 100
        assert [e["kind"] for e in account["entries"]] == ["deposit", "charge"]

        # Pays the debt: balance first (100), rest with card (200)
        paid = _ok(
            client.post(
                f"/api/v1/debts/student/{sid}/{sale['sale_id']}/pay",
                json={"payment_method": "card", "use_balance": True},
            )
        )
        assert paid["sale_id"] == sale["sale_id"]
        assert _ok(client.get(f"/api/v1/debts/student/{sid}")) == []
        assert _ok(client.get(f"/api/v1/balance/{sid}"))["current_balance"] == 0

        account = _account(client, sid)
        assert account["total_pending"] == 0
        [entry] = _charges(account)
        assert entry["status"] == "paid"
        assert entry["amount"] == 300
        assert entry["paid_with_balance"] == 100
        assert entry["paid_now"] == 200
        assert entry["payment_method"] == "card"
        assert entry["paid_at"] is not None
        assert entry["description"] == "Venta: Proteína x2"

        # Caja: 100 cash (deposit) + 200 card (debt payment); the 100 paid with
        # balance is NOT counted again.
        period = _ok(client.get("/api/v1/transactions/open-period"))
        assert (period["total_cash"], period["total_card"], period["grand_total"]) == (
            100,
            200,
            300,
        )

    def test_sale_fully_paid_with_balance_is_in_the_history(self, client: TestClient) -> None:
        sid = _student(client, "Beto")["student_id"]
        product = _product(client, price=80)
        _ok(
            client.post(
                f"/api/v1/balance/{sid}/deposit", json={"amount": 200, "payment_method": "transfer"}
            )
        )

        _ok(
            client.post(
                "/api/v1/inventory/sales",
                json={
                    "product_id": product["product_id"],
                    "quantity": 1,
                    "student_id": sid,
                    "payment_method": "cash",
                    "balance_amount": 80,
                },
            ),
            201,
        )
        account = _account(client, sid)
        assert account["current_balance"] == 120
        [entry] = _charges(account)
        assert entry["status"] == "paid"
        assert entry["amount"] == 80
        assert entry["paid_with_balance"] == 80 and entry["paid_now"] == 0
        assert entry["concept_type"] == "product"
        # Only the deposit (200 transfer) is income
        period = _ok(client.get("/api/v1/transactions/open-period"))
        assert period["grand_total"] == 200 and period["total_transfer"] == 200

    def test_insufficient_balance_does_not_touch_stock(self, client: TestClient) -> None:
        sid = _student(client, "Caro")["student_id"]
        product = _product(client, price=100, stock=3)
        response = client.post(
            "/api/v1/inventory/sales",
            json={
                "product_id": product["product_id"],
                "student_id": sid,
                "payment_method": "cash",
                "balance_amount": 50,
            },
        )
        assert response.status_code == 400
        assert "Saldo insuficiente" in response.json()["detail"]
        assert _ok(client.get(f"/api/v1/inventory/products/{product['product_id']}"))["stock"] == 3


class TestPublicoGeneral:
    def test_can_pay_now(self, client: TestClient) -> None:
        product = _product(client, price=25)
        sale = _ok(
            client.post(
                "/api/v1/inventory/sales",
                json={"product_id": product["product_id"], "payment_method": "cash"},
            ),
            201,
        )
        assert sale["student_id"] is None
        charge = _ok(
            client.post(
                "/api/v1/transactions/charge",
                json={"transaction_type": "other", "amount": 40, "payment_method": "card"},
            ),
            201,
        )
        assert charge["transaction_id"] and charge["debt_id"] is None
        assert _ok(client.get("/api/v1/transactions/open-period"))["grand_total"] == 65

    @pytest.mark.parametrize(
        "payload",
        [
            {"payment_method": "cash", "payment_status": "pending"},
            {"payment_method": "cash", "balance_amount": 10},
        ],
    )
    def test_cannot_owe_or_use_balance(self, client: TestClient, payload: dict[str, Any]) -> None:
        product = _product(client, price=25, stock=5)
        response = client.post(
            "/api/v1/inventory/sales", json={"product_id": product["product_id"], **payload}
        )
        assert response.status_code == 400
        assert "Público general" in response.json()["detail"]
        assert _ok(client.get(f"/api/v1/inventory/products/{product['product_id']}"))["stock"] == 5

        response = client.post(
            "/api/v1/transactions/charge",
            json={"transaction_type": "other", "amount": 40, **payload},
        )
        assert response.status_code == 400


class TestMembershipCharges:
    def test_membership_paid_with_balance_and_card(self, client: TestClient) -> None:
        sid = _student(client, "Dani")["student_id"]
        _ok(
            client.post(
                f"/api/v1/balance/{sid}/deposit", json={"amount": 400, "payment_method": "cash"}
            )
        )
        membership = _ok(
            client.post(
                "/api/v1/memberships",
                json={
                    "student_id": sid,
                    "membership_type": "room_elite",
                    "start_date": "2026-10-27",
                    "end_date": "2026-11-26",
                    "price_paid": 1000,
                    "payment_method": "card",
                    "balance_amount": 400,
                },
            ),
            201,
        )
        [entry] = _charges(_account(client, sid))
        assert entry["reference_id"] == membership["membership_id"]
        assert entry["concept_type"] == "membership"
        assert (entry["amount"], entry["paid_with_balance"], entry["paid_now"]) == (1000, 400, 600)
        assert entry["status"] == "paid"
        period = _ok(client.get("/api/v1/transactions/open-period"))
        assert (period["total_cash"], period["total_card"]) == (400, 600)

    def test_membership_on_credit_then_paid_in_full(self, client: TestClient) -> None:
        sid = _student(client, "Eli")["student_id"]
        membership = _ok(
            client.post(
                "/api/v1/memberships",
                json={
                    "student_id": sid,
                    "membership_type": "room_daily",
                    "start_date": "2026-10-27",
                    "end_date": "2026-11-26",
                    "price_paid": 1300,
                    "payment_status": "pending",
                },
            ),
            201,
        )
        assert membership["status"] == "active"  # access granted, money still owed
        account = _account(client, sid)
        assert account["total_pending"] == 1300
        [entry] = _charges(account)
        assert entry["concept_type"] == "membership" and entry["status"] == "pending"

        paid = _ok(
            client.post(f"/api/v1/debts/student/{sid}/pay-all", json={"payment_method": "transfer"})
        )
        assert len(paid) == 1
        [entry] = _charges(_account(client, sid))
        assert entry["status"] == "paid" and entry["paid_now"] == 1300
        assert entry["payment_method"] == "transfer"
        assert entry["reference_id"] == membership["membership_id"]

    def test_mixed_payment_for_remaining_after_balance(self, client: TestClient) -> None:
        sid = _student(client, "Fer")["student_id"]
        _ok(
            client.post(
                f"/api/v1/balance/{sid}/deposit", json={"amount": 300, "payment_method": "cash"}
            )
        )
        _ok(
            client.post(
                "/api/v1/transactions/charge",
                json={
                    "student_id": sid,
                    "transaction_type": "other",
                    "amount": 500,
                    "balance_amount": 300,
                    "payment_method": "mixed",
                    "payment_splits": [
                        {"method": "cash", "amount": 100},
                        {"method": "card", "amount": 100},
                    ],
                    "notes": "Inscripción",
                },
            ),
            201,
        )
        [entry] = _charges(_account(client, sid))
        assert entry["description"] == "Inscripción"
        assert (entry["amount"], entry["paid_with_balance"], entry["paid_now"]) == (500, 300, 200)
        assert entry["payment_method"] == "mixed"
        assert len(entry["payment_splits"]) == 2


class TestPortalAccount:
    def test_student_sees_their_statement(self, client: TestClient) -> None:
        student = _student(client, "Gaby")
        product = _product(client, price=60)
        _ok(
            client.post(
                "/api/v1/inventory/sales",
                json={
                    "product_id": product["product_id"],
                    "student_id": student["student_id"],
                    "payment_method": "cash",
                    "payment_status": "pending",
                },
            ),
            201,
        )
        # Log in as the student (resolved by e-mail, like Cognito users are)
        app.dependency_overrides[get_current_user] = lambda: {
            "sub": "cognito-sub-gaby",
            "email": student["email"],
            "cognito:groups": ["student"],
        }
        try:
            body = _ok(client.get("/api/v1/portal/account"))
        finally:
            from tests.conftest import override_get_current_user

            app.dependency_overrides[get_current_user] = override_get_current_user
        assert body["role"] == "student"
        assert body["account"]["total_pending"] == 60
        assert body["account"]["entries"][0]["description"] == "Venta: Proteína x1"
