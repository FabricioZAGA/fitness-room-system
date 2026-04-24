"""Domain exceptions for Fitness Room System.

All business logic exceptions should extend these base classes.
HTTP status codes are mapped in the exception handlers registered in main.py.
"""

from typing import NoReturn

from fastapi import HTTPException, status


class FitnessRoomException(Exception):
    """Base exception for all Fitness Room domain errors."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class ResourceNotFoundException(FitnessRoomException):
    """Raised when a requested resource does not exist."""


class ResourceAlreadyExistsException(FitnessRoomException):
    """Raised when attempting to create a resource that already exists."""


class InvalidOperationException(FitnessRoomException):
    """Raised when an operation is not allowed in the current state."""


class CapacityExceededException(FitnessRoomException):
    """Raised when a class reservation limit has been reached."""


class WaitlistFullException(FitnessRoomException):
    """Raised when the waitlist for a class is also full."""


class MembershipExpiredException(FitnessRoomException):
    """Raised when a student's membership has expired."""


class MembershipNotFoundException(FitnessRoomException):
    """Raised when a student has no active membership."""


def raise_not_found(resource: str, identifier: str) -> NoReturn:
    """Raise HTTP 404 with a consistent message format."""
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{resource} with id '{identifier}' not found.",
    )


def raise_conflict(message: str) -> NoReturn:
    """Raise HTTP 409 with a conflict message."""
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=message,
    )


def raise_bad_request(message: str) -> NoReturn:
    """Raise HTTP 400 with a validation or business rule message."""
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=message,
    )


def raise_forbidden(message: str) -> NoReturn:
    """Raise HTTP 403 with a permission message."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=message,
    )
