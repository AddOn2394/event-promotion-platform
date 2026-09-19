import { z } from "zod";

// ADR-024 — payload de POST /webhooks/resend, ya verificado por firma Svix antes de llegar
// acá (ver apps/api/src/webhooks/service.ts). La firma prueba que Resend lo envió, no que
// tenga la forma que el código espera — sin este schema, un evento de un tipo que sí
// mapeamos (email.delivered/bounced/failed) pero con un `data` inesperado (cambio futuro
// del payload de Resend, evento malformado) rompía con un TypeError no controlado en vez
// de tratarse como el resto de eventos sin mapeo (200 OK, sin tocar nada).
export const ResendWebhookEventSchema = z
  .object({
    type: z.string(),
    data: z.object({ email_id: z.string() }).passthrough().optional(),
  })
  .passthrough();

export type ResendWebhookEvent = z.infer<typeof ResendWebhookEventSchema>;
