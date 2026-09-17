import { Router } from "express";
import { asyncHandler } from "../shared/async-handler.js";
import { requireAdminAuth } from "../shared/auth-middleware.js";
import { postAdminLogin, postCrearInvitacion } from "./controller.js";

export const adminRouter = Router();

adminRouter.post("/admin/auth/login", asyncHandler(postAdminLogin));
adminRouter.post("/admin/invitaciones", requireAdminAuth, asyncHandler(postCrearInvitacion));
