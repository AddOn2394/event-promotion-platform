import { LoginClienteRequestSchema, LoginClienteResponseSchema } from "@event-promotion/shared-types";
import type { Request, Response } from "express";
import { CLIENTE_COOKIE_NAME, clienteCookieOptions } from "../shared/cookies.js";
import { signClienteToken } from "../shared/jwt.js";
import { loginCliente } from "./service.js";

export async function postLoginCliente(req: Request, res: Response): Promise<void> {
  const body = LoginClienteRequestSchema.parse(req.body);
  const sesion = await loginCliente(body.email, body.codigo);

  const token = signClienteToken({ idinvitacion: sesion.idinvitacion, email: sesion.email });
  res.cookie(CLIENTE_COOKIE_NAME, token, clienteCookieOptions());

  res.status(200).json(
    LoginClienteResponseSchema.parse({ email: sesion.email, nombreCliente: sesion.nombreCliente }),
  );
}
