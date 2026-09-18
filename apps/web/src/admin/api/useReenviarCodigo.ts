import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReenviarCodigoResponseSchema, type ReenviarCodigoResponse } from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

// HU-11 (ADR-026): genera un código nuevo — la respuesta nunca incluye el código.
export function useReenviarCodigo() {
  const queryClient = useQueryClient();
  return useMutation<ReenviarCodigoResponse, Error, string>({
    mutationFn: async (idinvitacion) => {
      const data = await apiFetch<unknown>(`/admin/invitaciones/${idinvitacion}/reenviar`, { method: "POST" });
      return ReenviarCodigoResponseSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "invitaciones"] });
    },
  });
}
