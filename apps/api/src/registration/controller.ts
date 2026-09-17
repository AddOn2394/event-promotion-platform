import { ConfirmarAsistenciaRequestSchema, ConfirmarAsistenciaResponseSchema } from "@event-promotion/shared-types";
import type { Request, Response } from "express";
import { HttpError } from "../shared/http-error.js";
import { confirmarAsistencia } from "./service.js";

export async function postConfirmarAsistencia(req: Request, res: Response): Promise<void> {
  if (!req.cliente) {
    // requireClienteAuth ya debería haber cortado antes — defensivo, no debería alcanzarse.
    throw new HttpError(401, "No autenticado");
  }
  const body = ConfirmarAsistenciaRequestSchema.parse(req.body);
  const resultado = await confirmarAsistencia(req.cliente.idinvitacion, req.cliente.email, body);
  res.status(201).json(ConfirmarAsistenciaResponseSchema.parse(resultado));
}
