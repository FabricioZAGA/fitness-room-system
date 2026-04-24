"""Unit tests for EventNotifier email-delivery path.

These tests mock boto3 SES / sesv2 / SNS clients and isolate the notifier
from any real AWS call. They exist because the email path has been the
source of multiple silent-failure bugs — suppression, config-set, raw
attachments — and regressions here are hard to catch otherwise.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from src.services.event_notifier import (
    EventNotifier,
    SuppressedRecipientError,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def notifier() -> EventNotifier:
    """EventNotifier with mocked boto clients and repos.

    Monkey-patches the three boto clients on the instance *after* construction
    so we never make a real AWS call even if boto3 defaults change.
    """
    notif_repo = MagicMock()
    instructor_repo = MagicMock()

    with patch("src.services.event_notifier.boto3.client") as mock_boto:
        # boto3.client is called three times in __init__ (ses, sesv2, sns).
        mock_boto.side_effect = [MagicMock(), MagicMock(), MagicMock()]
        n = EventNotifier(
            notification_repo=notif_repo,
            instructor_repo=instructor_repo,
        )
    # Expose mocks for assertions.
    n._ses = MagicMock()  # type: ignore[assignment]
    n._sesv2 = MagicMock()  # type: ignore[assignment]
    n._sns = MagicMock()  # type: ignore[assignment]
    return n


def _not_found_client_error() -> ClientError:
    return ClientError(
        error_response={"Error": {"Code": "NotFoundException", "Message": "Not on list"}},
        operation_name="GetSuppressedDestination",
    )


def _random_sesv2_error() -> ClientError:
    return ClientError(
        error_response={"Error": {"Code": "ServiceUnavailable", "Message": "boom"}},
        operation_name="GetSuppressedDestination",
    )


# ── _check_not_suppressed ─────────────────────────────────────────────────────


class TestCheckNotSuppressed:
    def test_raises_suppressed_error_when_address_is_suppressed(
        self, notifier: EventNotifier
    ) -> None:
        notifier._sesv2.get_suppressed_destination.return_value = {
            "SuppressedDestination": {
                "EmailAddress": "bad@example.com",
                "Reason": "BOUNCE",
            }
        }
        with pytest.raises(SuppressedRecipientError) as excinfo:
            notifier._check_not_suppressed("bad@example.com")
        assert excinfo.value.recipient == "bad@example.com"
        assert excinfo.value.reason == "BOUNCE"

    def test_not_found_is_silent(self, notifier: EventNotifier) -> None:
        """SES returns NotFoundException when the address isn't suppressed —
        that's the happy path and must not raise."""
        notifier._sesv2.get_suppressed_destination.side_effect = (
            _not_found_client_error()
        )
        # Should return None without raising.
        assert notifier._check_not_suppressed("ok@example.com") is None

    def test_other_sesv2_errors_dont_block_send(
        self, notifier: EventNotifier
    ) -> None:
        """If the lookup fails for any other reason (throttle, outage, …),
        we don't want to block legitimate sends — log-and-continue."""
        notifier._sesv2.get_suppressed_destination.side_effect = (
            _random_sesv2_error()
        )
        assert notifier._check_not_suppressed("ok@example.com") is None

    def test_missing_reason_falls_back_to_unknown(
        self, notifier: EventNotifier
    ) -> None:
        notifier._sesv2.get_suppressed_destination.return_value = {
            "SuppressedDestination": {"EmailAddress": "bad@example.com"}
        }
        with pytest.raises(SuppressedRecipientError) as excinfo:
            notifier._check_not_suppressed("bad@example.com")
        assert excinfo.value.reason == "UNKNOWN"


# ── _send_email ───────────────────────────────────────────────────────────────


class TestSendEmail:
    def test_includes_configuration_set_when_configured(
        self, notifier: EventNotifier
    ) -> None:
        notifier._sesv2.get_suppressed_destination.side_effect = (
            _not_found_client_error()
        )
        notifier._settings.ses_configuration_set = "fitness-room-prod"  # type: ignore[misc]

        notifier._send_email("ok@example.com", "subj", "<p>body</p>")

        notifier._ses.send_email.assert_called_once()
        kwargs = notifier._ses.send_email.call_args.kwargs
        assert kwargs["ConfigurationSetName"] == "fitness-room-prod"
        assert kwargs["Destination"] == {"ToAddresses": ["ok@example.com"]}
        assert kwargs["Message"]["Subject"]["Data"] == "subj"

    def test_omits_configuration_set_when_empty(
        self, notifier: EventNotifier
    ) -> None:
        notifier._sesv2.get_suppressed_destination.side_effect = (
            _not_found_client_error()
        )
        notifier._settings.ses_configuration_set = ""  # type: ignore[misc]

        notifier._send_email("ok@example.com", "subj", "<p>body</p>")

        kwargs = notifier._ses.send_email.call_args.kwargs
        assert "ConfigurationSetName" not in kwargs

    def test_suppression_check_runs_before_send(
        self, notifier: EventNotifier
    ) -> None:
        """Suppressed addresses must not reach SES.SendEmail."""
        notifier._sesv2.get_suppressed_destination.return_value = {
            "SuppressedDestination": {
                "EmailAddress": "bad@example.com",
                "Reason": "COMPLAINT",
            }
        }
        with pytest.raises(SuppressedRecipientError):
            notifier._send_email("bad@example.com", "subj", "body")

        notifier._ses.send_email.assert_not_called()


# ── _send_email_with_attachment ───────────────────────────────────────────────


class TestSendEmailWithAttachment:
    def test_attachment_send_includes_config_set_header(
        self, notifier: EventNotifier
    ) -> None:
        """Raw-email path must inject X-SES-CONFIGURATION-SET header so SES
        routes feedback events the same way as structured SendEmail."""
        notifier._sesv2.get_suppressed_destination.side_effect = (
            _not_found_client_error()
        )
        notifier._settings.ses_configuration_set = "fitness-room-prod"  # type: ignore[misc]

        notifier._send_email_with_attachment(
            "ok@example.com",
            "subj",
            "<p>body</p>",
            b"\x25PDF-1.4 fake",
            "file.pdf",
        )

        notifier._ses.send_raw_email.assert_called_once()
        raw = notifier._ses.send_raw_email.call_args.kwargs["RawMessage"]["Data"]
        assert "X-SES-CONFIGURATION-SET: fitness-room-prod" in raw

    def test_attachment_send_without_config_set_has_no_header(
        self, notifier: EventNotifier
    ) -> None:
        notifier._sesv2.get_suppressed_destination.side_effect = (
            _not_found_client_error()
        )
        notifier._settings.ses_configuration_set = ""  # type: ignore[misc]

        notifier._send_email_with_attachment(
            "ok@example.com",
            "subj",
            "<p>body</p>",
            b"PDF",
            "file.pdf",
        )

        raw = notifier._ses.send_raw_email.call_args.kwargs["RawMessage"]["Data"]
        assert "X-SES-CONFIGURATION-SET" not in raw

    def test_attachment_send_blocked_by_suppression(
        self, notifier: EventNotifier
    ) -> None:
        notifier._sesv2.get_suppressed_destination.return_value = {
            "SuppressedDestination": {
                "EmailAddress": "bad@example.com",
                "Reason": "BOUNCE",
            }
        }
        with pytest.raises(SuppressedRecipientError):
            notifier._send_email_with_attachment(
                "bad@example.com", "subj", "body", b"PDF", "file.pdf"
            )
        notifier._ses.send_raw_email.assert_not_called()


# ── notify_portal_credentials ─────────────────────────────────────────────────


class TestNotifyPortalCredentials:
    """Return contract for the credentials-email helper the users router relies on."""

    def test_returns_sent_on_success(self, notifier: EventNotifier) -> None:
        notifier._sesv2.get_suppressed_destination.side_effect = (
            _not_found_client_error()
        )
        result = notifier.notify_portal_credentials(
            student_name="Sara Hernandez",
            student_email="sara@example.com",
            password="TempPass1!",
        )
        assert result == {"status": "sent", "detail": ""}
        notifier._ses.send_email.assert_called_once()
        notifier._notif_repo.save.assert_called_once()

    def test_returns_suppressed_without_sending(
        self, notifier: EventNotifier
    ) -> None:
        notifier._sesv2.get_suppressed_destination.return_value = {
            "SuppressedDestination": {
                "EmailAddress": "sara@example.com",
                "Reason": "BOUNCE",
            }
        }
        result = notifier.notify_portal_credentials(
            student_name="Sara",
            student_email="sara@example.com",
            password="x",
        )
        assert result["status"] == "suppressed"
        assert result["detail"] == "BOUNCE"
        notifier._ses.send_email.assert_not_called()
        # Failure is audited.
        notifier._notif_repo.save.assert_called_once()

    def test_returns_failed_on_unexpected_ses_error(
        self, notifier: EventNotifier
    ) -> None:
        notifier._sesv2.get_suppressed_destination.side_effect = (
            _not_found_client_error()
        )
        notifier._ses.send_email.side_effect = ClientError(
            error_response={"Error": {"Code": "MessageRejected", "Message": "reason"}},
            operation_name="SendEmail",
        )
        result = notifier.notify_portal_credentials(
            student_name="Sara",
            student_email="sara@example.com",
            password="x",
        )
        assert result["status"] == "failed"
        assert "MessageRejected" in result["detail"] or "reason" in result["detail"]
        notifier._notif_repo.save.assert_called_once()
