/** TypeScript types for the Catalog entity — mirrors backend Pydantic models. */

export interface CatalogItem {
  catalog_name: string;
  slug: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCatalogItemRequest {
  label: string;
  color?: string;
  sort_order?: number;
}

export interface UpdateCatalogItemRequest {
  label?: string;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
}

/** Well-known catalog names. */
export const CATALOG_CLASS_TYPES = "class_types" as const;
export const CATALOG_SPECIALTIES = "specialties" as const;
export type CatalogName = typeof CATALOG_CLASS_TYPES | typeof CATALOG_SPECIALTIES;
