import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { ZodError } from "zod";
import { adminRouter } from "./admin/routes.js";
import { authRouter } from "./auth/routes.js";
import { catalogRouter } from "./catalog/routes.js";
import { registrationRouter } from "./registration/routes.js";
import { HttpError } from "./shared/http-error.js";
import { slotsRouter } from "./slots/routes.js";
import { webhooksRouter } from "./webhooks/routes.js";

// Separado de index.ts para que los tests de integración puedan montar la app con
// supertest sin abrir un puerto real (app.listen()).
function getFrontendUrl(): string {
  const url = process.env.FRONTEND_URL;
  if (!url) {
    throw new Error("FRONTEND_URL no está configurada — necesaria para el origin de CORS.");
  }
  return url;
}

export function createApp(): Express {
  const app = express();

  // credentials:true + origin exacto (nunca "*") porque el navegador solo adjunta la
  // cookie httpOnly de sesión (ADR-011/013) en una respuesta CORS con un origin explícito.
  app.use(cors({ origin: getFrontendUrl(), credentials: true }));

  // Montado antes de express.json(): webhooksRouter necesita el body crudo (express.raw())
  // para verificar la firma Svix del webhook de Resend (ADR-024) — express.json() global
  // consumiría el stream y dejaría solo el objeto ya parseado.
  app.use(webhooksRouter);

  app.use(express.json());
  app.use(cookieParser());

  app.get("/", (_req, res) => {
    res.send("Feria de Promociones API — en construcción (ver spec/PLAN_DESARROLLO.md, Gate 2)");
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(adminRouter);
  app.use(authRouter);
  app.use(catalogRouter);
  app.use(slotsRouter);
  app.use(registrationRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ error: "JSON inválido" });
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  });

  return app;
}
