import express, { Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { postWebhookResend } from "./controller.js";

export const webhooksRouter = Router();

// express.raw() antes del express.json() global (app.ts monta este router primero) —
// la verificación de firma Svix necesita el body exacto que Resend firmó, no el objeto ya
// parseado/re-serializado.
webhooksRouter.post(
  "/webhooks/resend",
  express.raw({ type: "application/json" }),
  asyncHandler(postWebhookResend),
);
