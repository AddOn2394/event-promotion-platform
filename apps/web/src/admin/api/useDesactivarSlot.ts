import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../shared/api/client";

// HU-10 (ADR-007): soft-delete — DELETE /admin/slots/:id marca activo=false.
export function useDesactivarSlot() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiFetch<void>(`/admin/slots/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "slots"] });
    },
  });
}
