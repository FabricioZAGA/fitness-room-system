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
    ) -> None:
        self._membership_repo = membership_repo or MembershipRepository()
        self._student_repo = student_repo or StudentRepository()
        self._transaction_repo = transaction_repo or TransactionRepository()

    def assign_membership(self, data: MembershipCreate) -> MembershipResponse:
        """Assign a new membership to a student.

        Validates:
        - Student exists
        - Student does not already have an active membership
        - For Room Dúo: partner exists, partner has active duo, both renew together

        Args:
            data: Validated membership creation payload.

        Returns:
            The created membership response.
        """
        logger.info("Assigning membership", extra={"student_id": data.student_id})

        self._student_repo.get_by_id(data.student_id)

        # Duo-specific validations
        if data.membership_type == MembershipType.ROOM_DUO:
            partner = self._student_repo.get_by_id(data.duo_partner_id)  # type: ignore[arg-type]
            partner_name = f"{partner.first_name} {partner.last_name}".strip()
            data.duo_partner_name = partner_name

            # Block renewal if partner's DUO is still active (both must renew together)
            partner_active = self._membership_repo.get_active_for_student(
                data.duo_partner_id  # type: ignore[arg-type]
            )
            if (
                partner_active
                and partner_active.membership_type == MembershipType.ROOM_DUO.value
            ):
                partner_end = partner_active.end_date
                raise_bad_request(
                    f"No se puede renovar: la membresía DÚO requiere que ambos "
                    f"renueven al mismo tiempo. La membresía de {partner_name} "
                    f"sigue activa hasta {partner_end}."
                )

        existing_active = self._membership_repo.get_active_for_student(data.student_id)
        if existing_active:
            logger.info(
                "Auto-cancelling existing active membership for renewal",
                extra={
                    "student_id": data.student_id,
                    "previous_membership_id": existing_active.membership_id,
                },
            )
            self._membership_repo.update(
                data.student_id,
                existing_active.membership_id,
                MembershipUpdate(status=MembershipStatus.CANCELLED),
            )

        item = self._membership_repo.create(data)
        logger.info("Membership assigned", extra={"membership_id": item.membership_id})

        # Auto-record transaction so income appears in Caja/Reports immediately.
        if data.price_paid > 0:
            is_session_pack = data.membership_type == MembershipType.ROOM_FLEX
            tx_type = TransactionType.CLASS_PACK if is_session_pack else TransactionType.MEMBERSHIP

            try:
                payment_method = PaymentMethod(data.payment_method)
            except ValueError:
                payment_method = PaymentMethod.CASH

            try:
                self._transaction_repo.create_transaction(
                    TransactionCreate(
                        student_id=data.student_id,
                        transaction_type=tx_type,
                        amount=data.price_paid,
                        payment_method=payment_method,
                        reference_id=item.membership_id,
                        notes=f"Membresía: {data.membership_type}",
                    )
                )
            except Exception:
                logger.warning(
                    "Failed to create transaction for membership",
                    extra={"membership_id": item.membership_id},
                )

        return item.to_response()

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
                        is_session_pack = data.membership_type == MembershipType.ROOM_FLEX
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
