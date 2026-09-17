import { Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { postLoginCliente } from "./controller.js";

export const authRouter = Router();

authRouter.post("/auth/login", asyncHandler(postLoginCliente));
