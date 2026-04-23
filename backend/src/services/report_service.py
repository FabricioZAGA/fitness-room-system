"""Report service — aggregations over existing data for business reports.

All reports are computed at query time from DynamoDB data.
No separate report table is needed for Phase 2.

Available reports:
- Income by date range    — from transactions
- Attendance by class type — from reservations (attended)
- Top students ranking    — from checkins per student
- Inactive students       — students with no checkin in last N days
"""

from datetime import date, timedelta
from typing import Any

from aws_lambda_powertools import Logger

from src.models.checkin import CheckinDynamoItem
from src.repositories.membership_repository import MembershipRepository
from src.repositories.reservation_repository import ReservationRepository
from src.repositories.student_repository import StudentRepository
from src.repositories.transaction_repository import TransactionRepository

logger = Logger()


class ReportService:
    """Aggregate-query service for gym management reports."""

    def __init__(
        self,
        transaction_repo: TransactionRepository | None = None,
        reservation_repo: ReservationRepository | None = None,
        membership_repo: MembershipRepository | None = None,
        student_repo: StudentRepository | None = None,
    ) -> None:
        self._tx = transaction_repo or TransactionRepository()
        self._reservations = reservation_repo or ReservationRepository()
        self._memberships = membership_repo or MembershipRepository()
        self._students = student_repo or StudentRepository()

    # ------------------------------------------------------------------
    # Income report
    # ------------------------------------------------------------------

    def income_by_date_range(
        self, start_date: date, end_date: date
    ) -> dict[str, Any]:
        """Aggregate income between two dates (inclusive).

        Returns per-day totals and a grand total breakdown by type and method.
        """
        current = start_date
        days: list[dict[str, Any]] = []
        grand_cash = 0.0
        grand_card = 0.0
        grand_transfer = 0.0
        by_type: dict[str, float] = {}

        while current <= end_date:
            date_str = current.isoformat()
            transactions, _ = self._tx.list_transactions_by_date(date_str, limit=500)

            day_cash = sum(t.amount for t in transactions if t.payment_method == "cash")
            day_card = sum(t.amount for t in transactions if t.payment_method == "card")
            day_transfer = sum(
                t.amount for t in transactions if t.payment_method == "transfer"
            )
            day_total = day_cash + day_card + day_transfer

            for t in transactions:
                by_type[t.transaction_type] = (
                    by_type.get(t.transaction_type, 0.0) + t.amount
                )

            grand_cash += day_cash
            grand_card += day_card
            grand_transfer += day_transfer

            days.append(
                {
                    "date": date_str,
                    "total": day_total,
                    "cash": day_cash,
                    "card": day_card,
                    "transfer": day_transfer,
                    "count": len(transactions),
                }
            )
            current += timedelta(days=1)

        grand_total = grand_cash + grand_card + grand_transfer
        return {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "grand_total": grand_total,
            "total_cash": grand_cash,
            "total_card": grand_card,
            "total_transfer": grand_transfer,
            "by_type": by_type,
            "days": days,
        }

    # ------------------------------------------------------------------
    # Attendance summary
    # ------------------------------------------------------------------

    def attendance_summary(self, days: int = 30) -> dict[str, Any]:
        """Aggregate reservation attendance stats for the last N days.

        Returns totals per status (attended, no_show, confirmed, cancelled)
        across all students.
        """
        since = (date.today() - timedelta(days=days)).isoformat()

        # Fetch all students and iterate their reservations
        students, _ = self._students.list_all(limit=500)
        totals: dict[str, int] = {}

        for student in students:
            reservations, _ = self._reservations.list_for_student(
                student.student_id, limit=200
            )
            for r in reservations:
                if hasattr(r, "class_date") and r.class_date >= since:
                    status = r.status
                    totals[status] = totals.get(status, 0) + 1

        return {
            "period_days": days,
            "attended": totals.get("attended", 0),
            "no_show": totals.get("no_show", 0),
            "confirmed": totals.get("confirmed", 0),
            "cancelled": totals.get("cancelled", 0),
            "total": sum(totals.values()),
        }

    # ------------------------------------------------------------------
    # Rankings
    # ------------------------------------------------------------------

    def top_students_by_checkins(
        self, limit: int = 10, days: int = 30
    ) -> list[dict[str, Any]]:
        """Return the top N students ranked by check-in count in the last N days.

        For each active student, queries their checkins and counts those
        within the time window. Acceptable for small gym (< 500 students).
        """
        since = (date.today() - timedelta(days=days)).isoformat()

        students, _ = self._students.list_all(limit=500)
        active_students = [
            s for s in students if s.status == "active"
        ]

        ranked: list[dict[str, Any]] = []
        for student in active_students:
            sid = student.student_id
            # Query checkins: PK=STUDENT#{id}, SK begins_with CHECKIN#
            checkin_items, _ = self._students.query_by_pk(
                pk=f"STUDENT#{sid}",
                sk_begins_with="CHECKIN#",
                limit=200,
            )
            recent_count = sum(
                1
                for c in checkin_items
                if c.get("checked_in_at", "")[:10] >= since and c.get("can_enter")
            )
            if recent_count > 0:
                ranked.append(
                    {
                        "student_id": sid,
                        "student_name": f"{student.first_name} {student.last_name}".strip(),
                        "checkin_count": recent_count,
                    }
                )

        ranked.sort(key=lambda x: x["checkin_count"], reverse=True)
        return ranked[:limit]

    # ------------------------------------------------------------------
    # Inactivity alerts
    # ------------------------------------------------------------------

    def inactive_students(self, inactive_days: int = 14) -> list[dict[str, Any]]:
        """Return active students who haven't checked in (successfully) for N days.

        Fetches all active students and checks their recent checkins.
        """
        cutoff = (date.today() - timedelta(days=inactive_days)).isoformat()

        students, _ = self._students.list_all(limit=500)
        active_students = [
            s for s in students if s.status == "active"
        ]

        inactive: list[dict[str, Any]] = []
        for student in active_students:
            sid = student.student_id
            checkin_items, _ = self._students.query_by_pk(
                pk=f"STUDENT#{sid}",
                sk_begins_with="CHECKIN#",
                limit=100,
            )
            has_recent = any(
                c.get("checked_in_at", "")[:10] >= cutoff and c.get("can_enter")
                for c in checkin_items
            )
            if not has_recent:
                inactive.append(
                    {
                        "student_id": sid,
                        "student_name": f"{student.first_name} {student.last_name}".strip(),
                        "status": student.status,
                        "email": student.email,
                        "phone": student.phone,
                    }
                )

        return inactive
