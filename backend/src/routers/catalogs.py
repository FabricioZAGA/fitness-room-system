"""Catalogs router — CRUD for admin-configurable catalogs (class types, specialties)."""

from typing import Any

from aws_lambda_powertools import Logger
from fastapi import APIRouter, Depends, Path, status

from src.models.catalog import (
    CATALOG_CLASS_TYPES,
    CATALOG_SPECIALTIES,
    VALID_CATALOG_NAMES,
    CatalogItemCreate,
    CatalogItemResponse,
    CatalogItemUpdate,
    slugify,
)
from src.repositories.catalog_repository import CatalogRepository
from src.utils.auth import get_current_user
from src.utils.exceptions import raise_bad_request, raise_conflict

logger = Logger()

router = APIRouter(prefix="/catalogs", tags=["Catalogs"])


def _repo() -> CatalogRepository:
    return CatalogRepository()


def _validate_catalog_name(catalog_name: str) -> str:
    if catalog_name not in VALID_CATALOG_NAMES:
        raise_bad_request(
            f"Invalid catalog '{catalog_name}'. "
            f"Valid catalogs: {', '.join(sorted(VALID_CATALOG_NAMES))}"
        )
    return catalog_name


# ── List ─────────────────────────────────────────────────────────────────────

@router.get(
    "/{catalog_name}",
    response_model=list[CatalogItemResponse],
    summary="List Catalog Items",
    description="Return all active items in a catalog, sorted by sort_order.",
)
def list_items(
    catalog_name: str = Path(..., description="Catalog name"),
    include_inactive: bool = False,
    _current_user: dict[str, Any] = Depends(get_current_user),
    repo: CatalogRepository = Depends(_repo),
) -> list[CatalogItemResponse]:
    _validate_catalog_name(catalog_name)
    items = repo.list_all(catalog_name, include_inactive=include_inactive)
    return [i.to_response() for i in items]


# ── Create ───────────────────────────────────────────────────────────────────

@router.post(
    "/{catalog_name}",
    response_model=CatalogItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Catalog Item",
    description="Add a new item to a catalog.",
)
def create_item(
    data: CatalogItemCreate,
    catalog_name: str = Path(..., description="Catalog name"),
    _current_user: dict[str, Any] = Depends(get_current_user),
    repo: CatalogRepository = Depends(_repo),
) -> CatalogItemResponse:
    _validate_catalog_name(catalog_name)
    slug = slugify(data.label)
    if repo.exists(catalog_name, slug):
        raise_conflict(f"Item '{data.label}' (slug: {slug}) already exists in '{catalog_name}'.")
    item = repo.create(catalog_name, data)
    logger.info("Catalog item created", extra={"catalog": catalog_name, "slug": item.slug})
    return item.to_response()


# ── Update ───────────────────────────────────────────────────────────────────

@router.patch(
    "/{catalog_name}/{slug}",
    response_model=CatalogItemResponse,
    summary="Update Catalog Item",
    description="Update label, color, sort_order, or is_active for a catalog item.",
)
def update_item(
    data: CatalogItemUpdate,
    catalog_name: str = Path(...),
    slug: str = Path(...),
    _current_user: dict[str, Any] = Depends(get_current_user),
    repo: CatalogRepository = Depends(_repo),
) -> CatalogItemResponse:
    _validate_catalog_name(catalog_name)
    item = repo.update(catalog_name, slug, data)
    logger.info("Catalog item updated", extra={"catalog": catalog_name, "slug": slug})
    return item.to_response()


# ── Delete ───────────────────────────────────────────────────────────────────

@router.delete(
    "/{catalog_name}/{slug}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Catalog Item",
    description="Permanently remove a catalog item. Prefer PATCH is_active=false for soft-delete.",
)
def delete_item(
    catalog_name: str = Path(...),
    slug: str = Path(...),
    _current_user: dict[str, Any] = Depends(get_current_user),
    repo: CatalogRepository = Depends(_repo),
) -> None:
    _validate_catalog_name(catalog_name)
    repo.delete(catalog_name, slug)
    logger.info("Catalog item deleted", extra={"catalog": catalog_name, "slug": slug})


# ── Seed / Migration ────────────────────────────────────────────────────────

# Current hardcoded values that need to be migrated into DynamoDB.
_SEED_CLASS_TYPES: list[dict[str, Any]] = [
    {"label": "Hyrox", "slug": "hyrox", "color": "bg-[--color-danger-bg] text-[--color-danger] border-[--color-danger-bd]", "sort_order": 0},
    {"label": "Strong Nation", "slug": "strong_nation", "color": "bg-[--color-warning-bg] text-[--color-warning] border-[--color-warning-bd]", "sort_order": 1},
    {"label": "Entrenamiento Funcional", "slug": "entrenamiento_funcional", "color": "bg-[--color-primary-bg] text-[--color-primary] border-[--color-primary-bd]", "sort_order": 2},
    {"label": "Yoga", "slug": "yoga", "color": "bg-[--color-success-bg] text-[--color-success] border-[--color-success-bd]", "sort_order": 3},
    {"label": "Mat", "slug": "mat", "color": "bg-[--color-info-bg] text-[--color-info] border-[--color-info-bd]", "sort_order": 4},
    {"label": "Zumba", "slug": "zumba", "color": "bg-[--color-info-bg] text-[--color-info] border-[--color-info-bd]", "sort_order": 5},
    {"label": "Otra", "slug": "other", "color": "bg-[--bg-muted] text-[--tx-muted] border-[--bd-subtle]", "sort_order": 99},
]

_SEED_SPECIALTIES: list[dict[str, Any]] = [
    {"label": "Zumba", "sort_order": 0},
    {"label": "Yoga", "sort_order": 1},
    {"label": "Spinning", "sort_order": 2},
    {"label": "CrossFit", "sort_order": 3},
    {"label": "Funcional", "sort_order": 4},
    {"label": "Boxing", "sort_order": 5},
    {"label": "Pilates", "sort_order": 6},
    {"label": "HIIT", "sort_order": 7},
    {"label": "Aerobics", "sort_order": 8},
    {"label": "Danza", "sort_order": 9},
    {"label": "Kickboxing", "sort_order": 10},
    {"label": "TRX", "sort_order": 11},
    {"label": "Stretching", "sort_order": 12},
    {"label": "Body Pump", "sort_order": 13},
    {"label": "Pole Fitness", "sort_order": 14},
    {"label": "Hyrox", "sort_order": 15},
    {"label": "Strong Nation", "sort_order": 16},
    {"label": "Entrenamiento Funcional", "sort_order": 17},
    {"label": "Mat", "sort_order": 18},
]


@router.post(
    "/seed",
    summary="Seed Catalogs",
    description=(
        "One-time migration: populate class_types and specialties catalogs "
        "with the current hardcoded values. Skips items that already exist."
    ),
)
def seed_catalogs(
    _current_user: dict[str, Any] = Depends(get_current_user),
    repo: CatalogRepository = Depends(_repo),
) -> dict[str, Any]:
    """Seed both catalogs with hardcoded defaults. Safe to call multiple times."""
    created = {"class_types": 0, "specialties": 0, "skipped": 0}

    for item_data in _SEED_CLASS_TYPES:
        slug = item_data.get("slug") or slugify(item_data["label"])
        if repo.exists(CATALOG_CLASS_TYPES, slug):
            created["skipped"] += 1
            continue
        payload = CatalogItemCreate(
            label=item_data["label"],
            color=item_data.get("color", ""),
            sort_order=item_data.get("sort_order", 0),
        )
        repo.create(CATALOG_CLASS_TYPES, payload, slug_override=slug)
        created["class_types"] += 1

    for item_data in _SEED_SPECIALTIES:
        slug = slugify(item_data["label"])
        if repo.exists(CATALOG_SPECIALTIES, slug):
            created["skipped"] += 1
            continue
        payload = CatalogItemCreate(
            label=item_data["label"],
            color="",
            sort_order=item_data.get("sort_order", 0),
        )
        repo.create(CATALOG_SPECIALTIES, payload, slug_override=slug)
        created["specialties"] += 1

    logger.info("Catalog seed completed", extra=created)
    return {"message": "Seed completed", **created}
