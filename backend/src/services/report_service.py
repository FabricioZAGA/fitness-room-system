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

from src.models.common import mexico_today

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
        self,
        start_date: date,
        end_date: date,
        include_transactions: bool = False,
    ) -> dict[str, Any]:
        """Aggregate income between two dates (inclusive).

        Returns per-day totals and a grand total breakdown by type and method.
        When ``include_transactions`` is True, also returns the flat list of
        every transaction in the range — used by the Excel export to populate
        the "Detalle de transacciones" sheet.
        """
        current = start_date
        days: list[dict[str, Any]] = []
        grand_cash = 0.0
        grand_card = 0.0
        grand_transfer = 0.0
        by_type: dict[str, float] = {}
        all_transactions: list[dict[str, Any]] = []

        # Build a student-id → name lookup once, only when transaction detail is asked
        student_name_by_id: dict[str, str] = {}
        if include_transactions:
            students, _ = self._students.list_all(limit=500)
            student_name_by_id = {
                s.student_id: f"{s.first_name} {s.last_name}".strip()
                for s in students
            }

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
                if include_transactions:
                    all_transactions.append(
                        {
                            "transaction_id": t.transaction_id,
                            "date": t.transaction_date,
                            "datetime": t.created_at.isoformat()
                            if hasattr(t.created_at, "isoformat")
                            else str(t.created_at),
                            "student_id": t.student_id,
                            "student_name": student_name_by_id.get(
                                t.student_id or "", ""
                            ),
                            "transaction_type": t.transaction_type,
                            "payment_method": t.payment_method,
                            "amount": t.amount,
                            "reference_id": t.reference_id,
                            "notes": t.notes,
                        }
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
        result: dict[str, Any] = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "grand_total": grand_total,
            "total_cash": grand_cash,
            "total_card": grand_card,
            "total_transfer": grand_transfer,
            "by_type": by_type,
            "days": days,
        }
        if include_transactions:
            result["transactions"] = all_transactions
        return result

    # ------------------------------------------------------------------
    # Memberships by date range
    # ------------------------------------------------------------------

    def memberships_by_date_range(
        self, start_date: date, end_date: date
    ) -> dict[str, Any]:
        """List all memberships whose start_date falls inside the range.

        Returns alumno, plan, precio, fechas y status — useful to reconcile
        income vs activated memberships.
        """
        students, _ = self._students.list_all(limit=500)
        student_by_id = {
            s.student_id: f"{s.first_name} {s.last_name}".strip() for s in students
        }

        memberships: list[dict[str, Any]] = []
        total_revenue = 0.0
        by_type: dict[str, dict[str, Any]] = {}

        all_memberships, _ = self._memberships.list_all(limit=500)
        start_iso = start_date.isoformat()
        end_iso = end_date.isoformat()

        for m in all_memberships:
            ms = getattr(m, "start_date", None)
            ms_str = ms.isoformat() if hasattr(ms, "isoformat") else str(ms or "")
            if not (start_iso <= ms_str <= end_iso):
                continue

            mtype = getattr(m, "membership_type", "")
            price = float(getattr(m, "price", 0) or 0)
            end_d = getattr(m, "end_date", None)
            end_d_str = end_d.isoformat() if hasattr(end_d, "isoformat") else str(end_d or "")

            memberships.append(
                {
                    "membership_id": getattr(m, "membership_id", ""),
                    "student_id": getattr(m, "student_id", ""),
                    "student_name": student_by_id.get(
                        getattr(m, "student_id", ""), ""
                    ),
                    "membership_type": mtype,
                    "price": price,
                    "start_date": ms_str,
                    "end_date": end_d_str,
                    "status": getattr(m, "status", ""),
                    "classes_remaining": getattr(m, "classes_remaining", None),
                }
            )
            total_revenue += price
            agg = by_type.setdefault(mtype, {"count": 0, "revenue": 0.0})
            agg["count"] += 1
            agg["revenue"] += price

        memberships.sort(key=lambda x: x["start_date"])
        return {
            "start_date": start_iso,
            "end_date": end_iso,
            "count": len(memberships),
            "total_revenue": total_revenue,
            "by_type": by_type,
            "memberships": memberships,
        }

    # ------------------------------------------------------------------
    # Attendance summary
    # ------------------------------------------------------------------

    def attendance_summary(
        self,
        days: int = 30,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict[str, Any]:
        """Aggregate reservation attendance stats for a date range.

        If ``start_date``/``end_date`` are provided they take priority over
        ``days``. Otherwise falls back to "last N days from today".
        """
        if start_date and end_date:
            since = start_date.isoformat()
            until = end_date.isoformat()
            period_label = f"{since} a {until}"
        else:
            today = mexico_today()
            since = (today - timedelta(days=days)).isoformat()
            until = today.isoformat()
            period_label = f"últimos {days} días"

        students, _ = self._students.list_all(limit=500)
        totals: dict[str, int] = {}

        for student in students:
            reservations, _ = self._reservations.list_for_student(
                student.student_id, limit=200
            )
            for r in reservations:
                if hasattr(r, "class_date") and since <= r.class_date <= until:
                    status = r.status
                    totals[status] = totals.get(status, 0) + 1

        return {
            "period_days": days,
            "start_date": since,
            "end_date": until,
            "period_label": period_label,
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
        self,
        limit: int = 10,
        days: int = 30,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[dict[str, Any]]:
        """Return the top N students ranked by check-in count in a date range.

        If ``start_date``/``end_date`` are provided they take priority over
        ``days``. Otherwise falls back to "last N days from today".
        """
        if start_date and end_date:
            since = start_date.isoformat()
            until = end_date.isoformat()
        else:
            today = mexico_today()
            since = (today - timedelta(days=days)).isoformat()
            until = today.isoformat()

        students, _ = self._students.list_all(limit=500)
        active_students = [s for s in students if s.status == "active"]

        ranked: list[dict[str, Any]] = []
        for student in active_students:
            sid = student.student_id
            checkin_items, _ = self._students.query_by_pk(
                pk=f"STUDENT#{sid}",
                sk_begins_with="CHECKIN#",
                limit=200,
            )
            recent_count = sum(
                1
                for c in checkin_items
                if since <= c.get("checked_in_at", "")[:10] <= until
                and c.get("can_enter")
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

        Includes ``last_checkin`` for context when reaching out.
        """
        cutoff = (mexico_today() - timedelta(days=inactive_days)).isoformat()

        students, _ = self._students.list_all(limit=500)
        active_students = [s for s in students if s.status == "active"]

        inactive: list[dict[str, Any]] = []
        for student in active_students:
            sid = student.student_id
            checkin_items, _ = self._students.query_by_pk(
                pk=f"STUDENT#{sid}",
                sk_begins_with="CHECKIN#",
                limit=100,
            )
            successful = [
                c.get("checked_in_at", "")
                for c in checkin_items
                if c.get("can_enter")
            ]
            last_checkin = max(successful) if successful else None
            has_recent = last_checkin is not None and last_checkin[:10] >= cutoff
            if not has_recent:
                inactive.append(
                    {
                        "student_id": sid,
                        "student_name": f"{student.first_name} {student.last_name}".strip(),
                        "status": student.status,
                        "email": student.email,
                        "phone": student.phone,
                        "last_checkin": last_checkin[:10] if last_checkin else None,
                    }
                )

        return inactive

    # ------------------------------------------------------------------
    # Students export (full directory)
    # ------------------------------------------------------------------

    def students_export(self) -> list[dict[str, Any]]:
        """Return every student enriched with active membership info.

        Used by the frontend to generate an Excel/PDF directory of all
        students with name, email, phone, birth date, status, membership
        type, expiry date, and membership status.
        """
        students, _ = self._students.list_all(limit=500)

        # Build a map student_id → active membership
        all_memberships, _ = self._memberships.list_all(limit=500)
        active_by_student: dict[str, Any] = {}
        for m in all_memberships:
            sid = getattr(m, "student_id", "")
            m_status = getattr(m, "status", "")
            if m_status == "active" and sid not in active_by_student:
                active_by_student[sid] = m

        result: list[dict[str, Any]] = []
        for s in students:
            membership = active_by_student.get(s.student_id)
            end_d = getattr(membership, "end_date", None) if membership else None
            end_d_str = (
                end_d.isoformat() if hasattr(end_d, "isoformat") else str(end_d or "")
            ) if end_d else ""

            result.append(
                {
                    "student_id": s.student_id,
                    "full_name": f"{s.first_name} {s.last_name}".strip(),
                    "email": s.email,
                    "phone": s.phone or "",
                    "birth_date": (
                        s.birth_date.isoformat()
                        if hasattr(s.birth_date, "isoformat")
                        else str(s.birth_date or "")
                    ) if s.birth_date else "",
                    "status": s.status,
                    "membership_type": getattr(membership, "membership_type", "") if membership else "",
                    "membership_status": getattr(membership, "status", "") if membership else "",
                    "membership_expiry": end_d_str,
                    "membership_price": float(getattr(membership, "price", 0) or 0) if membership else 0,
                    "created_at": (
                        s.created_at.isoformat()
                        if hasattr(s.created_at, "isoformat")
                        else str(s.created_at or "")
                    ),
                }
            )

        return result
