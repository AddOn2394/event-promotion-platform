import { Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { requireAdminAuth } from "../shared/auth-middleware.js";
import {
  getConfirmacionesAdmin,
  getConfirmacionesAdminCsv,
  getListarInvitaciones,
  postAdminLogin,
  postCrearInvitacion,
  postReenviarCodigo,
} from "./controller.js";

export const adminRouter = Router();

adminRouter.post("/admin/auth/login", asyncHandler(postAdminLogin));
adminRouter.get("/admin/invitaciones", requireAdminAuth, asyncHandler(getListarInvitaciones));
adminRouter.post("/admin/invitaciones", requireAdminAuth, asyncHandler(postCrearInvitacion));
adminRouter.post("/admin/invitaciones/:id/reenviar", requireAdminAuth, asyncHandler(postReenviarCodigo));

// HU-8: el export CSV se monta antes que ningún :id genérico no aplica acá (rutas fijas),
// pero se declara antes del listado JSON por legibilidad (misma historia, dos formatos).
adminRouter.get("/admin/confirmaciones/export.csv", requireAdminAuth, asyncHandler(getConfirmacionesAdminCsv));
adminRouter.get("/admin/confirmaciones", requireAdminAuth, asyncHandler(getConfirmacionesAdmin));
