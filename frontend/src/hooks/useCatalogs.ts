/** TanStack Query hooks for the Catalogs module. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { catalogService } from "@/services/catalogService";
import type {
  CatalogItem,
  CatalogName,
  CreateCatalogItemRequest,
  UpdateCatalogItemRequest,
} from "@/types/catalog";
import { CATALOG_CLASS_TYPES, CATALOG_SPECIALTIES } from "@/types/catalog";

export const CATALOGS_KEY = "catalogs";

// ── Queries ─────────────────────────────────────────────────────────────────

export function useCatalog(catalogName: CatalogName, includeInactive = false) {
  return useQuery<CatalogItem[]>({
    queryKey: [CATALOGS_KEY, catalogName, { includeInactive }],
    queryFn: () => catalogService.list(catalogName, includeInactive),
    staleTime: 5 * 60 * 1000,
  });
}

/** Shorthand: list active class types from catalog. */
export function useClassTypes() {
  return useCatalog(CATALOG_CLASS_TYPES);
}

/** Shorthand: list active specialties from catalog. */
export function useSpecialties() {
  return useCatalog(CATALOG_SPECIALTIES);
}

// ── Mutations ───────────────────────────────────────────────────────────────

export function useCreateCatalogItem(catalogName: CatalogName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCatalogItemRequest) =>
      catalogService.create(catalogName, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATALOGS_KEY, catalogName] });
      toast.success("Elemento agregado al catálogo.");
    },
    onError: () => {
      toast.error("Error al agregar elemento.");
    },
  });
}

export function useUpdateCatalogItem(catalogName: CatalogName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      data,
    }: {
      slug: string;
      data: UpdateCatalogItemRequest;
    }) => catalogService.update(catalogName, slug, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATALOGS_KEY, catalogName] });
      toast.success("Elemento actualizado.");
    },
    onError: () => {
      toast.error("Error al actualizar elemento.");
    },
  });
}

export function useDeleteCatalogItem(catalogName: CatalogName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => catalogService.remove(catalogName, slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATALOGS_KEY, catalogName] });
      toast.success("Elemento eliminado.");
    },
    onError: () => {
      toast.error("Error al eliminar elemento.");
    },
  });
}

export function useSeedCatalogs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => catalogService.seed(),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: [CATALOGS_KEY] });
      toast.success(
        `Catálogos inicializados: ${result.class_types} tipos de clase, ${result.specialties} especialidades.`,
      );
    },
    onError: () => {
      toast.error("Error al inicializar catálogos.");
    },
  });
}
