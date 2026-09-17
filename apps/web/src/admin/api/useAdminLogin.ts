import { useMutation } from "@tanstack/react-query";
import {
  AdminLoginResponseSchema,
  type AdminLoginRequest,
  type AdminLoginResponse,
} from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

export function useAdminLogin() {
  return useMutation<AdminLoginResponse, Error, AdminLoginRequest>({
    mutationFn: async (body) => {
      const data = await apiFetch<unknown>("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return AdminLoginResponseSchema.parse(data);
    },
  });
}
