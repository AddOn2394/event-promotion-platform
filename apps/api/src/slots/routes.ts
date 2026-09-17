import { Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { requireClienteAuth } from "../shared/auth-middleware.js";
import { getSlots } from "./controller.js";

export const slotsRouter = Router();

slotsRouter.get("/slots", requireClienteAuth, asyncHandler(getSlots));
