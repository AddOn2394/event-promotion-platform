import { Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { requireClienteAuth } from "../shared/auth-middleware.js";
import { postConfirmarAsistencia } from "./controller.js";

export const registrationRouter = Router();

registrationRouter.post("/confirmaciones", requireClienteAuth, asyncHandler(postConfirmarAsistencia));
