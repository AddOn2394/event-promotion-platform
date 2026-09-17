import { useMutation } from "@tanstack/react-query";
import {
  ConfirmarAsistenciaResponseSchema,
  type ConfirmarAsistenciaRequest,
  type ConfirmarAsistenciaResponse,
} from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

export function useConfirmarAsistencia() {
  return useMutation<ConfirmarAsistenciaResponse, Error, ConfirmarAsistenciaRequest>({
    mutationFn: async (body) => {
      const data = await apiFetch<unknown>("/confirmaciones", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return ConfirmarAsistenciaResponseSchema.parse(data);
    },
  });
}
