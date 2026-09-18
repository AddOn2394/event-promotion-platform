import type { Request, Response } from "express";
import { procesarEventoResend, verificarFirmaWebhook } from "./service.js";

// req.body es un Buffer crudo acá (routes.ts monta express.raw() solo para esta ruta,
// antes de que el express.json() global de app.ts consuma el body) — necesario para que
// la verificación de firma Svix vea exactamente los bytes que Resend firmó.
export async function postWebhookResend(req: Request, res: Response): Promise<void> {
  const payload = verificarFirmaWebhook(req.body as Buffer, {
    "svix-id": req.header("svix-id"),
    "svix-timestamp": req.header("svix-timestamp"),
    "svix-signature": req.header("svix-signature"),
  });
  await procesarEventoResend(payload);
  res.status(200).json({ ok: true });
}
