import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../shared/api/client";

// HU-9 (ADR-007): soft-delete — DELETE /admin/catalogo/:id marca activo=false.
export function useDesactivarCatalogoItem() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiFetch<void>(`/admin/catalogo/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "catalogo"] });
    },
  });
}
