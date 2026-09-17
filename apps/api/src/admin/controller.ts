import {
  AdminLoginRequestSchema,
  AdminLoginResponseSchema,
  CrearInvitacionRequestSchema,
  CrearInvitacionResponseSchema,
} from "@event-promotion/shared-types";
import type { Request, Response } from "express";
import { ADMIN_COOKIE_NAME, adminCookieOptions } from "../shared/cookies.js";
import { signAdminToken } from "../shared/jwt.js";
import { crearInvitacion, loginAdmin } from "./service.js";

export async function postAdminLogin(req: Request, res: Response): Promise<void> {
  const body = AdminLoginRequestSchema.parse(req.body);
  const sesion = await loginAdmin(body.email, body.password);

  const token = signAdminToken({ idusuario: sesion.idusuario, email: sesion.email });
  res.cookie(ADMIN_COOKIE_NAME, token, adminCookieOptions());

  res.status(200).json(AdminLoginResponseSchema.parse({ email: sesion.email }));
}

export async function postCrearInvitacion(req: Request, res: Response): Promise<void> {
  const body = CrearInvitacionRequestSchema.parse(req.body);
  const invitacion = await crearInvitacion({
    email: body.email,
    nombreCliente: body.nombreCliente ?? null,
  });
  res.status(201).json(CrearInvitacionResponseSchema.parse(invitacion));
}
