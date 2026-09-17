import { Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { requireClienteAuth } from "../shared/auth-middleware.js";
import { getCatalogo, getConfiguracionDescuento } from "./controller.js";

export const catalogRouter = Router();

catalogRouter.get("/catalogo", requireClienteAuth, asyncHandler(getCatalogo));
// ADR-025: preview en vivo del descuento en apps/web necesita los mismos umbrales que
// usa apps/api al confirmar — nunca hardcodeados a mano del lado del cliente.
catalogRouter.get("/configuracion-descuento", requireClienteAuth, asyncHandler(getConfiguracionDescuento));
