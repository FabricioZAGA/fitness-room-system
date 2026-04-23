"""Phone number utilities — E.164 international validation and normalization."""

import re

# E.164: + followed by 7–15 digits
_E164_RE = re.compile(r"^\+\d{7,15}$")

# Legacy MX: 10 bare digits → auto-prefix +52
_MX_BARE_RE = re.compile(r"^\d{10}$")
_MX_NO_PLUS_RE = re.compile(r"^52\d{10}$")


def normalize_phone(value: str) -> str:
    """Normalize a phone number to E.164 format.

    Accepts:
      - E.164 already: +521234567890
      - MX bare 10 digits: 5512345678 → +525512345678
      - MX without +: 525512345678 → +525512345678
      - Any international with +: +14155551234

    Returns:
        Cleaned E.164 string.

    Raises:
        ValueError: If the number cannot be normalized to valid E.164.
    """
    cleaned = re.sub(r"[\s\-\(\).]", "", value.strip())

    # Legacy MX support: 10 bare digits → +52
    if _MX_BARE_RE.match(cleaned):
        cleaned = f"+52{cleaned}"
    elif _MX_NO_PLUS_RE.match(cleaned) or not cleaned.startswith("+"):
        cleaned = f"+{cleaned}"

    if not _E164_RE.match(cleaned):
        raise ValueError(
            "Teléfono inválido. Formato E.164 requerido: "
            "+ seguido de código de país y número (ej. +525512345678, +14155551234)"
        )
    return cleaned


def validate_phone_optional(v: str | None) -> str | None:
    """Pydantic field_validator helper for optional phone fields."""
    if v is None or v.strip() == "":
        return None
    return normalize_phone(v)


def validate_phone_required(v: str) -> str:
    """Pydantic field_validator helper for required phone fields."""
    if not v or v.strip() == "":
        return v
    return normalize_phone(v)
