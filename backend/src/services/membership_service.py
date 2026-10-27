"""Membership service — business logic for membership management.

Lifecycle (v3.0.0):

    pending ──(start_date reached and previous one ended)──▶ active
    active  ──(end_date passed)──────────────────────────────▶ expired
    active  ──(freeze / suspend / deactivate)──▶ frozen ──(unfreeze)──▶ active

Memberships are never cancelled (there are no refunds). Renewing while the
current membership is still running queues the new one as ``pending``; it starts
the day the current one ends. ``roll_student`` / ``roll_all`` apply the
transitions (lazily on reads and nightly via EventBridge).
"""

from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from aws_lambda_powertools import Logger

from src.models.common import mexico_today
from src.models.membership import (
    FreezeMembershipRequest,
    LapsedStudentResponse,
    MembershipCreate,
    MembershipDynamoItem,
    MembershipResponse,
    MembershipStatus,
    MembershipType,
    MembershipUpdate,
)
from src.models.student import StudentStatus
from src.models.transaction import (
    PaymentMethod,
    PaymentSplit,
    TransactionType,
    TransactionUpdate,
    validate_payment_splits,
)
from src.repositories.membership_plan_repository import MembershipPlanRepository
from src.repositories.membership_repository import MembershipRepository
from src.repositories.student_repository import StudentRepository
from src.repositories.transaction_repository import TransactionRepository
from src.services.settlement_service import ChargeRequest, PaymentSettlementService
from src.utils.exceptions import InvalidOperationException, raise_bad_request

logger = Logger()

# Statuses that mean "the student still has (or will have) a membership".
_CURRENT_STATUSES = {
    MembershipStatus.ACTIVE.value,
    MembershipStatus.FROZEN.value,
    MembershipStatus.PENDING.value,
}


class MembershipService:
    """Service for membership business logic operations."""

    def __init__(
        self,
        membership_repo: MembershipRepository | None = None,
        student_repo: StudentRepository | None = None,
        transaction_repo: TransactionRepository | None = None,
        plan_repo: MembershipPlanRepository | None = None,
        settlement: PaymentSettlementService | None = None,
    ) -> None:
        self._membership_repo = membership_repo or MembershipRepository()
        self._student_repo = student_repo or StudentRepository()
        self._transaction_repo = transaction_repo or TransactionRepository()
        self._plan_repo = plan_repo or MembershipPlanRepository()
        self._settlement = settlement or PaymentSettlementService(
            transaction_repo=self._transaction_repo
        )

    # ------------------------------------------------------------------
    # Assignment
    # ------------------------------------------------------------------

    def assign_membership(self, data: MembershipCreate) -> MembershipResponse:
        """Assign a new membership to a student.

        - If the student still has a running (or frozen / queued) membership,
          the new one is queued as ``pending`` and its dates are moved so it
          starts the day the last one ends (no days are lost).
        - Payment is settled through ``PaymentSettlementService`` (paid now,
          partially/fully with balance, or left as debt).
        - DÚO plans create TWO linked memberships and ONE charge.

        Args:
            data: Validated membership creation payload.

        Returns:
            The created membership response (primary student).
        """
        logger.info("Assigning membership", extra={"student_id": data.student_id})

        student = self._student_repo.get_by_id(data.student_id)
        student_name = f"{student.first_name} {student.last_name}".strip()

        # Session-pack validation (replaces removed model validator)
        if self._is_session_pack(data.membership_type) and data.classes_total is None:
            plan = self._plan_repo.get_by_slug_or_none(data.membership_type)
            if plan and plan.total_sessions:
                data.classes_total = plan.total_sessions
            else:
                raise_bad_request(
                    "Este plan requiere indicar el número de sesiones (classes_total)."
                )

        # Fail fast (before any write) if the payment cannot be settled.
        self._validate_charge(self._charge_for(data, membership_id=None))

        if self._is_duo_plan(data.membership_type):
            if not data.duo_partner_id:
                raise_bad_request(
                    "Este plan requiere seleccionar un compañero (duo_partner_id)."
                )
            return self._assign_duo_membership(data, student_name)

        return self._assign_single_membership(data)

    def _is_session_pack(self, membership_type: str) -> bool:
        """Check if a plan is session-based (has total_sessions)."""
        plan = self._plan_repo.get_by_slug_or_none(membership_type)
        if plan is not None:
            return plan.total_sessions is not None and plan.total_sessions > 0
        # Fallback for legacy slug without a plan record
        return membership_type == MembershipType.ROOM_FLEX

    def _is_duo_plan(self, membership_type: str) -> bool:
        """Check if the membership type corresponds to a DÚO-type plan."""
        if membership_type == MembershipType.ROOM_DUO:
            return True
        plan = self._plan_repo.get_by_slug_or_none(membership_type)
        return plan is not None and plan.requires_partner

    def _plan_label(self, membership_type: str) -> str:
        """Human-readable plan name (falls back to the slug)."""
        plan = self._plan_repo.get_by_slug_or_none(membership_type)
        return plan.label if plan else membership_type

    def _charge_for(
        self,
        data: MembershipCreate,
        membership_id: str | None,
        description: str | None = None,
    ) -> ChargeRequest:
        """Build the Caja charge for a membership."""
        concept = (
            TransactionType.CLASS_PACK
            if self._is_session_pack(data.membership_type)
            else TransactionType.MEMBERSHIP
        )
        return ChargeRequest(
            student_id=data.student_id,
            amount=data.price_paid,
            concept_type=concept,
            description=description or f"Membresía: {self._plan_label(data.membership_type)}",
            reference_id=membership_id,
            payment_status=data.payment_status,
            balance_amount=data.balance_amount,
            payment_method=data.payment_method,
            payment_splits=data.payment_splits,
        )

    def _validate_charge(self, charge: ChargeRequest) -> None:
        """Validate a charge, mapping domain errors to HTTP 400."""
        try:
            self._settlement.validate(charge)
        except InvalidOperationException as exc:
            raise_bad_request(exc.message)

    def _settle_or_rollback(
        self, charge: ChargeRequest, created: list[MembershipDynamoItem]
    ) -> None:
        """Settle the charge; delete the memberships just created if it fails."""
        try:
            self._settlement.settle(charge)
        except Exception as exc:
            logger.exception(
                "Membership payment failed — rolling back membership creation",
                extra={"membership_ids": [m.membership_id for m in created]},
            )
            for m in created:
                self._membership_repo.delete(m.student_id, m.membership_id)
            if isinstance(exc, InvalidOperationException):
                raise_bad_request(exc.message)
            raise

    @staticmethod
    def _queue_tail(items: list[MembershipDynamoItem]) -> date | None:
        """Latest end date among a student's active / frozen / pending memberships."""
        ends = [date.fromisoformat(m.end_date) for m in items if m.status in _CURRENT_STATUSES]
        return max(ends) if ends else None

    @staticmethod
    def _schedule(
        data: MembershipCreate, tail: date | None
    ) -> tuple[MembershipCreate, MembershipStatus]:
        """Resolve the dates and initial status of a new membership.

        ``end_date`` is exclusive (a 30-day plan from the 1st ends on the 31st and
        grants access until the 30th), so a queued membership starts exactly on
        the previous ``end_date``.
        """
        start, end = data.start_date, data.end_date
        if tail is not None and start < tail:
            shift = timedelta(days=(tail - start).days)
            start, end = start + shift, end + shift
        status = MembershipStatus.PENDING if start > mexico_today() else MembershipStatus.ACTIVE
        return data.model_copy(update={"start_date": start, "end_date": end}), status

    def _assign_single_membership(self, data: MembershipCreate) -> MembershipResponse:
        """Standard (non-DÚO) membership assignment."""
        items = self._roll_items(
            data.student_id, self._membership_repo.list_all_for_student(data.student_id)
        )
        scheduled, status = self._schedule(data, self._queue_tail(items))

        item = self._membership_repo.create(scheduled, status=status)
        logger.info(
            "Membership assigned",
            extra={
                "membership_id": item.membership_id,
                "status": status.value,
                "start_date": item.start_date,
            },
        )
        self._settle_or_rollback(self._charge_for(scheduled, item.membership_id), [item])
        return item.to_response()

    def _assign_duo_membership(
        self, data: MembershipCreate, student_name: str,
    ) -> MembershipResponse:
        """DÚO membership: create TWO linked memberships + ONE charge.

        Both memberships share the same dates; if either student still has a
        running membership, both are queued after the later one ends.
        """
        partner_id: str = data.duo_partner_id or ""
        partner = self._student_repo.get_by_id(partner_id)
        partner_name = f"{partner.first_name} {partner.last_name}".strip()

        student_items = self._roll_items(
            data.student_id, self._membership_repo.list_all_for_student(data.student_id)
        )
        partner_items = self._roll_items(
            partner_id, self._membership_repo.list_all_for_student(partner_id)
        )

        # A partner already in a DÚO with someone else cannot be paired again.
        partner_active = next(
            (m for m in partner_items if m.status == MembershipStatus.ACTIVE.value), None
        )
        if (
            partner_active
            and self._is_duo_plan(partner_active.membership_type)
            and partner_active.duo_partner_id not in (None, data.student_id)
        ):
            raise_bad_request(
                f"{partner_name} ya tiene una membresía DÚO activa con otra persona "
                f"hasta {partner_active.end_date}."
            )

        tails = [t for t in (self._queue_tail(student_items), self._queue_tail(partner_items)) if t]
        data.duo_partner_name = partner_name
        scheduled, status = self._schedule(data, max(tails) if tails else None)

        item_a = self._membership_repo.create(scheduled, status=status)
        partner_data = MembershipCreate(
            student_id=partner_id,
            membership_type=scheduled.membership_type,
            start_date=scheduled.start_date,
            end_date=scheduled.end_date,
            price_paid=0,
            payment_method=scheduled.payment_method,
            classes_total=scheduled.classes_total,
            notes=scheduled.notes,
            duo_partner_id=scheduled.student_id,
            duo_partner_name=student_name,
        )
        item_b = self._membership_repo.create(partner_data, status=status)
        logger.info(
            "DÚO memberships created",
            extra={
                "membership_a": item_a.membership_id,
                "membership_b": item_b.membership_id,
                "status": status.value,
            },
        )

        self._settle_or_rollback(
            self._charge_for(
                scheduled,
                item_a.membership_id,
                description=f"Membresía DÚO: {student_name} + {partner_name}",
            ),
            [item_a, item_b],
        )
        return item_a.to_response()

    # ------------------------------------------------------------------
    # Lifecycle roll (pending → active → expired, auto-unfreeze)
    # ------------------------------------------------------------------

    def roll_student(self, student_id: str) -> None:
        """Apply due lifecycle transitions for one student (idempotent, cheap)."""
        self._roll_items(student_id, self._membership_repo.list_all_for_student(student_id))

    def roll_all(self) -> dict[str, int]:
        """Apply due lifecycle transitions for every student (nightly job)."""
        by_student: dict[str, list[MembershipDynamoItem]] = defaultdict(list)
        for m in self._membership_repo.list_all_items():
            by_student[m.student_id].append(m)

        changed = 0
        for student_id, items in by_student.items():
            before = {m.membership_id: m.status for m in items}
            after = self._roll_items(student_id, items)
            changed += sum(1 for m in after if before.get(m.membership_id) != m.status)
        logger.info(
            "Membership roll completed",
            extra={"students": len(by_student), "changed": changed},
        )
        return {"students": len(by_student), "changed": changed}

    def _roll_items(
        self, student_id: str, items: list[MembershipDynamoItem]
    ) -> list[MembershipDynamoItem]:
        """Apply transitions to a student's memberships and return the updated list.

        1. Fixed-length freezes whose ``freeze_end_date`` arrived are unfrozen.
        2. While the student has no frozen membership: the active one expires
           once its (exclusive) end date arrives — the same rule check-in uses
           (``days_until_expiry <= 0`` denies entry) — and the earliest due
           ``pending`` membership becomes active.
        """
        today = mexico_today()
        result = {m.membership_id: m for m in items}

        for m in list(result.values()):
            if (
                m.status == MembershipStatus.FROZEN.value
                and m.freeze_end_date
                and date.fromisoformat(m.freeze_end_date) <= today
            ):
                updated, delta = self._membership_repo.unfreeze(
                    student_id, m.membership_id, date.fromisoformat(m.freeze_end_date)
                )
                result[m.membership_id] = updated
                self._shift_queue(student_id, delta, result)

        if any(m.status == MembershipStatus.FROZEN.value for m in result.values()):
            return list(result.values())

        actives = sorted(
            (m for m in result.values() if m.status == MembershipStatus.ACTIVE.value),
            key=lambda m: m.end_date,
        )
        # Defensive: legacy data could hold more than one active membership.
        for stale in actives[:-1]:
            if date.fromisoformat(stale.end_date) <= today:
                result[stale.membership_id] = self._set_status(
                    student_id, stale, MembershipStatus.EXPIRED
                )
        current = actives[-1] if actives else None
        queue = sorted(
            (m for m in result.values() if m.status == MembershipStatus.PENDING.value),
            key=lambda m: m.start_date,
        )

        while True:
            if current is not None:
                if date.fromisoformat(current.end_date) > today:
                    break
                result[current.membership_id] = self._set_status(
                    student_id, current, MembershipStatus.EXPIRED
                )
                current = None
            nxt = queue[0] if queue else None
            if nxt is None or date.fromisoformat(nxt.start_date) > today:
                break
            current = self._set_status(student_id, nxt, MembershipStatus.ACTIVE)
            result[nxt.membership_id] = current
            queue.pop(0)

        return list(result.values())

    def _set_status(
        self, student_id: str, item: MembershipDynamoItem, status: MembershipStatus
    ) -> MembershipDynamoItem:
        """Persist a status transition."""
        logger.info(
            "Membership status transition",
            extra={
                "student_id": student_id,
                "membership_id": item.membership_id,
                "from": item.status,
                "to": status.value,
            },
        )
        return self._membership_repo.update(
            student_id, item.membership_id, MembershipUpdate(status=status)
        )

    def _shift_queue(
        self,
        student_id: str,
        days: int,
        items: dict[str, MembershipDynamoItem] | None = None,
    ) -> None:
        """Move every queued (pending) membership by ``days`` to keep the queue contiguous."""
        if days == 0:
            return
        pending = (
            [m for m in items.values() if m.status == MembershipStatus.PENDING.value]
            if items is not None
            else self._membership_repo.list_pending_for_student(student_id)
        )
        for m in pending:
            updated = self._membership_repo.shift_dates(student_id, m.membership_id, days)
            if items is not None:
                items[m.membership_id] = updated

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------

    def get_membership(self, student_id: str, membership_id: str) -> MembershipResponse:
        """Get a specific membership by student and membership ID."""
        item = self._membership_repo.get_by_id(student_id, membership_id)
        return item.to_response()

    def get_active_membership(self, student_id: str) -> MembershipResponse | None:
        """Get the active membership for a student, or None if none exists."""
        self._student_repo.get_by_id(student_id)
        self.roll_student(student_id)
        item = self._membership_repo.get_active_for_student(student_id)
        return item.to_response() if item else None

    def list_memberships_for_student(
        self,
        student_id: str,
        limit: int = 20,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[MembershipResponse], dict[str, Any] | None]:
        """List all memberships (active + queued + historical) for a student."""
        self._student_repo.get_by_id(student_id)
        self.roll_student(student_id)
        items, next_key = self._membership_repo.list_for_student(
            student_id, limit=limit, last_evaluated_key=last_evaluated_key
        )
        return [i.to_response() for i in items], next_key

    def list_expiring_soon(
        self, days: int = 7
    ) -> tuple[list[MembershipResponse], dict[str, Any] | None]:
        """List memberships expiring within the next N days (for renewal alerts)."""
        items, next_key = self._membership_repo.list_expiring_soon(days=days)
        return [i.to_response() for i in items], next_key

    def list_all_memberships(
        self,
        status_filter: str | None = None,
        limit: int = 200,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[MembershipResponse], dict[str, Any] | None]:
        """List all memberships (admin overview).

        Args:
            status_filter: Optional MembershipStatus value to filter by
                (e.g. 'active', 'pending', 'frozen', 'expired').
            limit: Max items to return.
            last_evaluated_key: Pagination token.

        Note: items with end_date < today are auto-classified as 'expired' in the
        response even if their stored status is still 'active' (the nightly roll
        job persists the transition).
        """
        items, next_key = self._membership_repo.list_all(
            limit=limit, last_evaluated_key=last_evaluated_key
        )
        today = mexico_today()
        responses: list[MembershipResponse] = []
        for i in items:
            r = i.to_response()
            if r.status == MembershipStatus.ACTIVE and r.end_date < today:
                r.status = MembershipStatus.EXPIRED
            responses.append(r)
        if status_filter:
            responses = [r for r in responses if r.status.value == status_filter]
        return responses, next_key

    def list_lapsed_students(self) -> list[LapsedStudentResponse]:
        """Students that are not inactive and have no active, frozen or queued membership.

        This is the "Vencidas" list: people who should renew. Students whose
        only membership is a stale ``active`` past its end date count as lapsed.
        """
        today = mexico_today()
        by_student: dict[str, list[MembershipDynamoItem]] = defaultdict(list)
        for m in self._membership_repo.list_all_items():
            by_student[m.student_id].append(m)

        def _is_current(m: MembershipDynamoItem) -> bool:
            if m.status == MembershipStatus.ACTIVE.value:
                return date.fromisoformat(m.end_date) > today
            return m.status in _CURRENT_STATUSES

        lapsed: list[LapsedStudentResponse] = []
        for s in self._student_repo.list_all_items():
            if s.status == StudentStatus.INACTIVE.value:
                continue
            memberships = by_student.get(s.student_id, [])
            if any(_is_current(m) for m in memberships):
                continue
            last = max(memberships, key=lambda m: m.end_date, default=None)
            last_end = date.fromisoformat(last.end_date) if last else None
            lapsed.append(
                LapsedStudentResponse(
                    student_id=s.student_id,
                    full_name=f"{s.first_name} {s.last_name}".strip(),
                    email=s.email,
                    phone=s.phone,
                    photo_url=s.photo_url,
                    student_status=s.status,
                    last_membership_id=last.membership_id if last else None,
                    last_membership_type=last.membership_type if last else None,
                    last_end_date=last_end,
                    days_since_expiry=max((today - last_end).days, 0) if last_end else None,
                )
            )
        # Most recently expired first; students who never had a membership last.
        lapsed.sort(
            key=lambda r: (r.last_end_date is not None, r.last_end_date or date.min),
            reverse=True,
        )
        return lapsed

    # ------------------------------------------------------------------
    # Updates
    # ------------------------------------------------------------------

    def update_membership(
        self,
        student_id: str,
        membership_id: str,
        data: MembershipUpdate,
    ) -> MembershipResponse:
        """Update membership details (e.g., extend expiry, change plan).

        Also syncs the linked Transaction when price, type, or payment_method
        change so that income reports stay accurate.

        Args:
            student_id: The student's ID.
            membership_id: The membership's ID.
            data: Partial update payload.

        Returns:
            The updated membership response.
        """
        logger.info("Updating membership", extra={"membership_id": membership_id})

        if data.status == MembershipStatus.CANCELLED:
            raise_bad_request(
                "El estatus 'cancelada' ya no existe: congela la membresía o déjala vencer."
            )

        current = self._membership_repo.get_by_id(student_id, membership_id)
        # Queued memberships keep their GSI3 key in sync with the new start date.
        if (
            data.status is None
            and data.start_date is not None
            and current.status == MembershipStatus.PENDING.value
        ):
            data = data.model_copy(update={"status": MembershipStatus.PENDING})

        # Validate the mixed-payment breakdown *before* writing anything so the
        # membership and its linked transaction never diverge.
        if data.payment_method is not None or data.payment_splits is not None or (
            data.price_paid is not None
        ):
            linked = self._transaction_repo.find_by_reference_id(student_id, membership_id)
            final_method = data.payment_method or (
                linked.payment_method if linked else PaymentMethod.CASH.value
            )
            final_price = data.price_paid if data.price_paid is not None else current.price_paid
            splits = data.payment_splits
            if splits is None and linked and linked.payment_splits:
                splits = [PaymentSplit.model_validate(s) for s in linked.payment_splits]
            if final_price > 0:
                try:
                    validate_payment_splits(final_method, final_price, splits)
                except ValueError as exc:
                    raise_bad_request(str(exc))

        item = self._membership_repo.update(student_id, membership_id, data)

        # Sync linked transaction when financial fields change
        needs_tx_sync = (
            data.price_paid is not None
            or data.membership_type is not None
            or data.payment_method is not None
            or data.payment_splits is not None
        )
        if needs_tx_sync:
            self._sync_linked_transaction(student_id, membership_id, data)

        return item.to_response()

    def _sync_linked_transaction(
        self, student_id: str, membership_id: str, data: MembershipUpdate
    ) -> None:
        """Propagate financial membership edits to its linked transaction (best effort)."""
        try:
            linked_tx = self._transaction_repo.find_by_reference_id(student_id, membership_id)
            if not linked_tx:
                logger.warning(
                    "No linked transaction found for membership update",
                    extra={"membership_id": membership_id, "student_id": student_id},
                )
                return
            tx_type: TransactionType | None = None
            notes: str | None = None
            if data.membership_type is not None:
                tx_type = (
                    TransactionType.CLASS_PACK
                    if self._is_session_pack(data.membership_type)
                    else TransactionType.MEMBERSHIP
                )
                notes = f"Membresía: {self._plan_label(data.membership_type)}"
            tx_data = TransactionUpdate(
                amount=data.price_paid,
                payment_method=PaymentMethod(data.payment_method) if data.payment_method else None,
                payment_splits=data.payment_splits,
                transaction_type=tx_type,
                notes=notes,
            )
            if not tx_data.model_dump(exclude_none=True):
                return
            self._transaction_repo.update_transaction(linked_tx.transaction_id, tx_data)
            logger.info(
                "Synced linked transaction after membership update",
                extra={
                    "membership_id": membership_id,
                    "transaction_id": linked_tx.transaction_id,
                },
            )
        except Exception:
            logger.exception(
                "Failed to sync linked transaction after membership update",
                extra={"membership_id": membership_id},
            )

    # ------------------------------------------------------------------
    # Freeze / unfreeze
    # ------------------------------------------------------------------

    def freeze_membership(
        self, student_id: str, membership_id: str, data: FreezeMembershipRequest
    ) -> MembershipResponse:
        """Freeze a membership for N days, extending expiry (and the queue) accordingly.

        Business rules:
        - Membership must be active (not already frozen, pending or expired).
        - Maximum 180 days freeze per request.
        """
        logger.info("Freezing membership", extra={"membership_id": membership_id})
        item = self._membership_repo.get_by_id(student_id, membership_id)
        if item.status != MembershipStatus.ACTIVE.value:
            raise_bad_request(
                f"La membresía no está activa (estatus: {item.status}). "
                "Solo se pueden congelar membresías activas."
            )
        return self.freeze_item(student_id, membership_id, data.days).to_response()

    def freeze_item(
        self, student_id: str, membership_id: str, days: int | None
    ) -> MembershipDynamoItem:
        """Freeze a membership (``days=None`` = indefinite) and shift the queue."""
        result, delta = self._membership_repo.freeze(student_id, membership_id, days)
        self._shift_queue(student_id, delta)
        return result

    def unfreeze_membership(self, student_id: str, membership_id: str) -> MembershipResponse:
        """Unfreeze a frozen membership, restoring active status."""
        logger.info("Unfreezing membership", extra={"membership_id": membership_id})
        item = self._membership_repo.get_by_id(student_id, membership_id)
        if item.status != MembershipStatus.FROZEN.value:
            raise_bad_request(
                f"La membresía no está congelada (estatus: {item.status})."
            )
        return self.unfreeze_item(student_id, membership_id).to_response()

    def unfreeze_item(self, student_id: str, membership_id: str) -> MembershipDynamoItem:
        """Unfreeze a membership crediting the actual days frozen, then roll."""
        result, delta = self._membership_repo.unfreeze(student_id, membership_id)
        self._shift_queue(student_id, delta)
        self.roll_student(student_id)
        return self._membership_repo.get_by_id(student_id, membership_id)

    def get_frozen_membership(self, student_id: str) -> MembershipDynamoItem | None:
        """Return the student's frozen membership, if any."""
        return next(
            (
                m
                for m in self._membership_repo.list_all_for_student(student_id)
                if m.status == MembershipStatus.FROZEN.value
            ),
            None,
        )
