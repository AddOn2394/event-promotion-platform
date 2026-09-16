import { describe, expect, it } from "vitest";
import { ConfirmarAsistenciaRequestSchema } from "@event-promotion/shared-types";

const slotId = "22222222-2222-2222-2222-222222222222";
const catalogoItemId = "11111111-1111-1111-1111-111111111111";

describe("ConfirmarAsistenciaRequestSchema (HU-3, G0)", () => {
  it("rechaza una selección vacía", () => {
    const result = ConfirmarAsistenciaRequestSchema.safeParse({ items: [], slotId });
    expect(result.success).toBe(false);
  });

  it("acepta al menos un ítem seleccionado", () => {
    const result = ConfirmarAsistenciaRequestSchema.safeParse({
      items: [{ catalogoItemId, categoria: "servicio" }],
      slotId,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un slotId que no es uuid", () => {
    const result = ConfirmarAsistenciaRequestSchema.safeParse({
      items: [{ catalogoItemId, categoria: "servicio" }],
      slotId: "no-es-uuid",
    });
    expect(result.success).toBe(false);
  });
});
