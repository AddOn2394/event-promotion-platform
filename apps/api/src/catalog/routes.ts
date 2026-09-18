import { Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { requireAdminAuth, requireClienteAuth } from "../shared/auth-middleware.js";
import {
  deleteCatalogoItem,
  getCatalogo,
  getCatalogoAdmin,
  getConfiguracionDescuento,
  patchCatalogoItem,
  patchConfiguracionDescuento,
  postCatalogoItem,
} from "./controller.js";

export const catalogRouter = Router();

catalogRouter.get("/catalogo", requireClienteAuth, asyncHandler(getCatalogo));
// ADR-025: preview en vivo del descuento en apps/web necesita los mismos umbrales que
// usa apps/api al confirmar — nunca hardcodeados a mano del lado del cliente.
catalogRouter.get("/configuracion-descuento", requireClienteAuth, asyncHandler(getConfiguracionDescuento));

// HU-9 (Gate 5, ADR-007): CRUD + soft-delete de catálogo.
catalogRouter.get("/admin/catalogo", requireAdminAuth, asyncHandler(getCatalogoAdmin));
catalogRouter.post("/admin/catalogo", requireAdminAuth, asyncHandler(postCatalogoItem));
catalogRouter.patch("/admin/catalogo/:id", requireAdminAuth, asyncHandler(patchCatalogoItem));
catalogRouter.delete("/admin/catalogo/:id", requireAdminAuth, asyncHandler(deleteCatalogoItem));

// HU-12 (Gate 5, ADR-023): pantalla de umbrales de descuento — mismo controller de lectura
// que la preview del cliente, montado bajo /admin con requireAdminAuth.
catalogRouter.get("/admin/configuracion/descuento", requireAdminAuth, asyncHandler(getConfiguracionDescuento));
catalogRouter.patch("/admin/configuracion/descuento", requireAdminAuth, asyncHandler(patchConfiguracionDescuento));
