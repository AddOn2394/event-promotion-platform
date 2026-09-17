import { useMutation } from "@tanstack/react-query";
import {
  LoginClienteResponseSchema,
  type LoginClienteRequest,
  type LoginClienteResponse,
} from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

export function useLoginCliente() {
  return useMutation<LoginClienteResponse, Error, LoginClienteRequest>({
    mutationFn: async (body) => {
      const data = await apiFetch<unknown>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return LoginClienteResponseSchema.parse(data);
    },
  });
}
