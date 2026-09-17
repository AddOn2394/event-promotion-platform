import { useQuery } from "@tanstack/react-query";
import { CatalogoResponseSchema, type CatalogoResponse } from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

export function useCatalogo() {
  return useQuery<CatalogoResponse>({
    queryKey: ["catalogo"],
    queryFn: async () => {
      const data = await apiFetch<unknown>("/catalogo");
      return CatalogoResponseSchema.parse(data);
    },
  });
}
