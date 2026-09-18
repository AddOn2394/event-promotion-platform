import { Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { requireClienteAuth } from "../shared/auth-middleware.js";
import {
  getConfirmacionPropia,
  patchConfirmacionPropia,
  postCancelarConfirmacionPropia,
  postConfirmarAsistencia,
} from "./controller.js";

export const registrationRouter = Router();

registrationRouter.post("/confirmaciones", requireClienteAuth, asyncHandler(postConfirmarAsistencia));
registrationRouter.get("/confirmaciones/mia", requireClienteAuth, asyncHandler(getConfirmacionPropia));
registrationRouter.patch("/confirmaciones/mia", requireClienteAuth, asyncHandler(patchConfirmacionPropia));
registrationRouter.post(
  "/confirmaciones/mia/cancelar",
  requireClienteAuth,
  asyncHandler(postCancelarConfirmacionPropia),
);
