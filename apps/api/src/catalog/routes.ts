import { Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { requireClienteAuth } from "../shared/auth-middleware.js";
import { getCatalogo } from "./controller.js";

export const catalogRouter = Router();

catalogRouter.get("/catalogo", requireClienteAuth, asyncHandler(getCatalogo));
