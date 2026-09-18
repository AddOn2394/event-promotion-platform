import { Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { requireAdminAuth, requireClienteAuth } from "../shared/auth-middleware.js";
import {
  deleteSlot,
  getConfiguracionEvento,
  getSlots,
  getSlotsAdmin,
  patchConfiguracionEvento,
  patchSlot,
  postSlot,
} from "./controller.js";

export const slotsRouter = Router();

slotsRouter.get("/slots", requireClienteAuth, asyncHandler(getSlots));

// HU-10 (Gate 5, ADR-007/ADR-009): CRUD + soft-delete de slots.
slotsRouter.get("/admin/slots", requireAdminAuth, asyncHandler(getSlotsAdmin));
slotsRouter.post("/admin/slots", requireAdminAuth, asyncHandler(postSlot));
slotsRouter.patch("/admin/slots/:id", requireAdminAuth, asyncHandler(patchSlot));
slotsRouter.delete("/admin/slots/:id", requireAdminAuth, asyncHandler(deleteSlot));

// HU-10 (Gate 5, ADR-010): N días de deadline de edición.
slotsRouter.get("/admin/configuracion", requireAdminAuth, asyncHandler(getConfiguracionEvento));
slotsRouter.patch("/admin/configuracion", requireAdminAuth, asyncHandler(patchConfiguracionEvento));
