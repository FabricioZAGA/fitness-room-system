/** Catalog API service — CRUD for dynamic class types and specialties. */

import type {
  CatalogItem,
  CatalogName,
  CreateCatalogItemRequest,
  UpdateCatalogItemRequest,
} from "@/types/catalog";
import { apiClient } from "./apiClient";

export const catalogService = {
  async list(
    catalogName: CatalogName,
    includeInactive = false,
  ): Promise<CatalogItem[]> {
    const response = await apiClient.get<CatalogItem[]>(
      `/catalogs/${catalogName}`,
      { params: { include_inactive: includeInactive } },
    );
    return response.data;
  },

  async create(
    catalogName: CatalogName,
    data: CreateCatalogItemRequest,
  ): Promise<CatalogItem> {
    const response = await apiClient.post<CatalogItem>(
      `/catalogs/${catalogName}`,
      data,
    );
    return response.data;
  },

  async update(
    catalogName: CatalogName,
    slug: string,
    data: UpdateCatalogItemRequest,
  ): Promise<CatalogItem> {
    const response = await apiClient.patch<CatalogItem>(
      `/catalogs/${catalogName}/${slug}`,
      data,
    );
    return response.data;
  },

  async remove(catalogName: CatalogName, slug: string): Promise<void> {
    await apiClient.delete(`/catalogs/${catalogName}/${slug}`);
  },

  async seed(): Promise<{ message: string; class_types: number; specialties: number; skipped: number }> {
    const response = await apiClient.post<{
      message: string;
      class_types: number;
      specialties: number;
      skipped: number;
    }>("/catalogs/seed");
    return response.data;
  },
} as const;
