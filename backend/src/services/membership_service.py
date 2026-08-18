"""Membership service — business logic for membership management."""

from typing import Any

from aws_lambda_powertools import Logger

from src.models.membership import (
    FreezeMembershipRequest,
    MembershipCreate,
    MembershipResponse,
    MembershipStatus,
    MembershipType,
    MembershipUpdate,
)
from src.models.transaction import (
    PaymentMethod,
    TransactionCreate,
    TransactionType,
    TransactionUpdate,
)
from src.repositories.membership_plan_repository import MembershipPlanRepository
from src.repositories.membership_repository import MembershipRepository
from src.repositories.student_repository import StudentRepository
from src.repositories.transaction_repository import TransactionRepository
from src.utils.exceptions import raise_bad_request

logger = Logger()


class MembershipService:
    """Service for membership business logic operations."""

    def __init__(
        self,
        membership_repo: MembershipRepository | None = None,
        student_repo: StudentRepository | None = None,
        transaction_repo: TransactionRepository | None = None,
        plan_repo: MembershipPlanRepository | None = None,
    ) -> None:
        self._membership_repo = membership_repo or MembershipRepository()
        self._student_repo = student_repo or StudentRepository()
        self._transaction_repo = transaction_repo or TransactionRepository()
        self._plan_repo = plan_repo or MembershipPlanRepository()

    def assign_membership(self, data: MembershipCreate) -> MembershipResponse:
        """Assign a new membership to a student.

        Validates:
        - Student exists
        - Student does not already have an active membership
        - For DÚO plans: partner exists, neither has active DÚO;
          creates TWO linked memberships (one per person) and ONE transaction.

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

        # Check if the plan requires a partner (DÚO)
        is_duo = self._is_duo_plan(data.membership_type)

        if is_duo:
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

    def _cancel_existing_active(
        self, student_id: str, context: str = "",
    ) -> None:
        """Cancel the student's current active membership if any."""
        existing = self._membership_repo.get_active_for_student(student_id)
        if existing:
            logger.info(
                "Auto-cancelling existing active membership for renewal",
                extra={
                    "student_id": student_id,
                    "previous_membership_id": existing.membership_id,
                    "context": context,
                },
            )
            self._membership_repo.update(
                student_id,
                existing.membership_id,
                MembershipUpdate(status=MembershipStatus.CANCELLED),
            )

    def _create_transaction(
        self,
        student_id: str,
        membership_id: str,
        amount: float,
        payment_method_str: str,
        membership_type: str,
        notes: str | None = None,
    ) -> None:
        """Create the income transaction for a membership."""
        if amount <= 0:
            return
        session_pack = self._is_session_pack(membership_type)
        tx_type = TransactionType.CLASS_PACK if session_pack else TransactionType.MEMBERSHIP

        try:
            payment_method = PaymentMethod(payment_method_str)
        except ValueError:
            payment_method = PaymentMethod.CASH

        try:
            self._transaction_repo.create_transaction(
                TransactionCreate(
                    student_id=student_id,
                    transaction_type=tx_type,
                    amount=amount,
                    payment_method=payment_method,
                    reference_id=membership_id,
                    notes=notes or f"Membresía: {membership_type}",
                )
            )
        except Exception:
            logger.warning(
                "Failed to create transaction for membership",
                extra={"membership_id": membership_id},
            )

    def _assign_single_membership(self, data: MembershipCreate) -> MembershipResponse:
        """Standard (non-DÚO) membership assignment."""
        self._cancel_existing_active(data.student_id, context="single_renewal")

        item = self._membership_repo.create(data)
        logger.info("Membership assigned", extra={"membership_id": item.membership_id})

        self._create_transaction(
            student_id=data.student_id,
            membership_id=item.membership_id,
            amount=data.price_paid,
            payment_method_str=data.payment_method,
            membership_type=data.membership_type,
        )

        return item.to_response()

    def _assign_duo_membership(
        self, data: MembershipCreate, student_name: str,
    ) -> MembershipResponse:
        """DÚO membership: create TWO linked memberships + ONE transaction.

        Flow:
        1. Validate partner exists
        2. Block if either student already has an active DÚO
        3. Cancel existing active memberships for both
        4. Create membership A (student) with full price
        5. Create membership B (partner) with price_paid=0
        6. Create 1 transaction for the total amount
        """
        partner = self._student_repo.get_by_id(data.duo_partner_id)  # type: ignore[arg-type]
        partner_name = f"{partner.first_name} {partner.last_name}".strip()

        # Block if partner already has an active DÚO
        partner_active = self._membership_repo.get_active_for_student(
            data.duo_partner_id  # type: ignore[arg-type]
        )
        if (
            partner_active
            and partner_active.membership_type == MembershipType.ROOM_DUO
        ):
            raise_bad_request(
                f"No se puede crear: la membresía DÚO requiere que ambos "
                f"renueven al mismo tiempo. La membresía de {partner_name} "
                f"sigue activa hasta {partner_active.end_date}."
            )

        # Cancel existing memberships for both students
        self._cancel_existing_active(data.student_id, context="duo_renewal_student")
        self._cancel_existing_active(
            data.duo_partner_id,  # type: ignore[arg-type]
            context="duo_renewal_partner",
        )

        # Create primary membership (student A — holds the payment)
        data.duo_partner_name = partner_name
        item_a = self._membership_repo.create(data)
        logger.info(
            "DÚO membership A created",
            extra={"membership_id": item_a.membership_id, "student_id": data.student_id},
        )

        # Create partner membership (student B — price_paid=0, linked back to A)
        partner_data = MembershipCreate(
            student_id=data.duo_partner_id,  # type: ignore[arg-type]
            membership_type=data.membership_type,
            start_date=data.start_date,
            end_date=data.end_date,
            price_paid=0,
            payment_method=data.payment_method,
            classes_total=data.classes_total,
            notes=data.notes,
            duo_partner_id=data.student_id,
            duo_partner_name=student_name,
        )
        item_b = self._membership_repo.create(partner_data)
        logger.info(
            "DÚO membership B created",
            extra={"membership_id": item_b.membership_id, "student_id": data.duo_partner_id},
        )

        # ONE transaction for the total amount
        self._create_transaction(
            student_id=data.student_id,
            membership_id=item_a.membership_id,
            amount=data.price_paid,
            payment_method_str=data.payment_method,
            membership_type=data.membership_type,
            notes=f"Membresía DÚO: {student_name} + {partner_name}",
        )

        return item_a.to_response()

    def get_membership(self, student_id: str, membership_id: str) -> MembershipResponse:
        """Get a specific membership by student and membership ID."""
        item = self._membership_repo.get_by_id(student_id, membership_id)
        return item.to_response()

    def get_active_membership(self, student_id: str) -> MembershipResponse | None:
        """Get the active membership for a student, or None if none exists."""
        self._student_repo.get_by_id(student_id)
        item = self._membership_repo.get_active_for_student(student_id)
        return item.to_response() if item else None

    def list_memberships_for_student(
        self,
        student_id: str,
        limit: int = 20,
        last_evaluated_key: dict[str, Any] | None = None,
    ) -> tuple[list[MembershipResponse], dict[str, Any] | None]:
        """List all memberships (active + historical) for a student."""
        self._student_repo.get_by_id(student_id)
        items, next_key = self._membership_repo.list_for_student(
            student_id, limit=limit, last_evaluated_key=last_evaluated_key
        )
        return [i.to_response() for i in items], next_key

    def update_membership(
        self,
        student_id: str,
        membership_id: str,
        data: MembershipUpdate,
    ) -> MembershipResponse:
        """Update membership details (e.g., extend expiry, cancel).

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
        item = self._membership_repo.update(student_id, membership_id, data)

        # Sync linked transaction when financial fields change
        needs_tx_sync = (
            data.price_paid is not None
            or data.membership_type is not None
            or data.payment_method is not None
        )
        if needs_tx_sync:
            try:
                linked_tx = self._transaction_repo.find_by_reference_id(
                    student_id, membership_id
                )
                if linked_tx:
                    tx_update_fields: dict[str, Any] = {}
                    if data.price_paid is not None:
                        tx_update_fields["amount"] = data.price_paid
                    if data.payment_method is not None:
                        tx_update_fields["payment_method"] = data.payment_method
                    if data.membership_type is not None:
                        is_session_pack = self._is_session_pack(data.membership_type)
                        tx_type = (
                            TransactionType.CLASS_PACK if is_session_pack
                            else TransactionType.MEMBERSHIP
                        )
                        tx_update_fields["transaction_type"] = tx_type.value
                        tx_update_fields["notes"] = f"Membresía: {data.membership_type}"
                    if tx_update_fields:
                        pm = (
                            PaymentMethod(tx_update_fields["payment_method"])
                            if "payment_method" in tx_update_fields
                            else None
                        )
                        tt = (
                            TransactionType(tx_update_fields["transaction_type"])
                            if "transaction_type" in tx_update_fields
                            else None
                        )
                        tx_data = TransactionUpdate(
                            amount=tx_update_fields.get("amount"),
                            payment_method=pm,
                            transaction_type=tt,
                            notes=tx_update_fields.get("notes"),
                        )
                        self._transaction_repo.update_transaction(
                            linked_tx.transaction_id, tx_data
                        )
                        logger.info(
                            "Synced linked transaction after membership update",
                            extra={
                                "membership_id": membership_id,
                                "transaction_id": linked_tx.transaction_id,
                                "updates": tx_update_fields,
                            },
                        )
                else:
                    logger.warning(
                        "No linked transaction found for membership update",
                        extra={"membership_id": membership_id, "student_id": student_id},
                    )
            except Exception:
                logger.exception(
                    "Failed to sync linked transaction after membership update",
                    extra={"membership_id": membership_id},
                )

        return item.to_response()

    def cancel_membership(self, student_id: str, membership_id: str) -> MembershipResponse:
        """Cancel an active membership."""
        logger.info("Cancelling membership", extra={"membership_id": membership_id})
        return self.update_membership(
            student_id, membership_id, MembershipUpdate(status=MembershipStatus.CANCELLED)
        )

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
                (e.g. 'active', 'frozen', 'expired', 'cancelled').
            limit: Max items to return.
            last_evaluated_key: Pagination token.

        Note: items with end_date < today are auto-classified as 'expired' in the
        response even if their stored status is still 'active', so callers do not
        need to run a nightly job to flip statuses.
        """
        from src.models.common import mexico_today

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

    def freeze_membership(
        self, student_id: str, membership_id: str, data: FreezeMembershipRequest
    ) -> MembershipResponse:
        """Freeze a membership for N days, extending expiry accordingly.

        Business rules:
        - Membership must be active (not already frozen, cancelled, or expired).
        - Maximum 180 days freeze per request.
        """
        logger.info("Freezing membership", extra={"membership_id": membership_id})
        item = self._membership_repo.get_by_id(student_id, membership_id)
        if item.status != MembershipStatus.ACTIVE.value:
            raise_bad_request(
                f"Membership '{membership_id}' is not active (status: {item.status}). "
                "Only active memberships can be frozen."
            )
        result = self._membership_repo.freeze(student_id, membership_id, data.days)
        return result.to_response()

    def unfreeze_membership(self, student_id: str, membership_id: str) -> MembershipResponse:
        """Unfreeze a frozen membership, restoring active status."""
        logger.info("Unfreezing membership", extra={"membership_id": membership_id})
        item = self._membership_repo.get_by_id(student_id, membership_id)
        if item.status != MembershipStatus.FROZEN.value:
            raise_bad_request(
                f"Membership '{membership_id}' is not frozen (status: {item.status})."
            )
        result = self._membership_repo.unfreeze(student_id, membership_id)
        return result.to_response()
