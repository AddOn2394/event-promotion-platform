import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SlotAdminSchema, type ActualizarSlotRequest, type SlotAdmin } from "@event-promotion/shared-types";
import { apiFetch } from "../../shared/api/client";

export function useActualizarSlot() {
  const queryClient = useQueryClient();
  return useMutation<SlotAdmin, Error, { id: string; body: ActualizarSlotRequest }>({
    mutationFn: async ({ id, body }) => {
      const data = await apiFetch<unknown>(`/admin/slots/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      return SlotAdminSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "slots"] });
    },
  });
}
