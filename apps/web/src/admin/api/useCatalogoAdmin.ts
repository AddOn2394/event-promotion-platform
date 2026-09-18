import { useQuery } from "@tanstack/react-query";
import { CatalogoAdminResponseSchema, type CatalogoAdminResponse } from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

// HU-9: incluye ítems inactivos, a diferencia de GET /catalogo (cliente).
export function useCatalogoAdmin() {
  return useQuery<CatalogoAdminResponse>({
    queryKey: ["admin", "catalogo"],
    queryFn: async () => {
      const data = await apiFetch<unknown>("/admin/catalogo");
      return CatalogoAdminResponseSchema.parse(data);
    },
  });
}
