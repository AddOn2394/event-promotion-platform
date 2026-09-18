import {
  CancelarConfirmacionResponseSchema,
  ConfirmacionPropiaResponseSchema,
  ConfirmarAsistenciaRequestSchema,
  ConfirmarAsistenciaResponseSchema,
  EditarConfirmacionRequestSchema,
  EditarConfirmacionResponseSchema,
} from "@event-promotion/shared-types";
import type { Request, Response } from "express";
import { HttpError } from "../shared/http-error.js";
import { cancelarConfirmacion, confirmarAsistencia, editarConfirmacion, obtenerConfirmacionPropia } from "./service.js";

function requireCliente(req: Request): NonNullable<Request["cliente"]> {
  if (!req.cliente) {
    // requireClienteAuth ya debería haber cortado antes — defensivo, no debería alcanzarse.
    throw new HttpError(401, "No autenticado");
  }
  return req.cliente;
}

export async function postConfirmarAsistencia(req: Request, res: Response): Promise<void> {
  const cliente = requireCliente(req);
  const body = ConfirmarAsistenciaRequestSchema.parse(req.body);
  const resultado = await confirmarAsistencia(cliente.idinvitacion, cliente.email, body);
  res.status(201).json(ConfirmarAsistenciaResponseSchema.parse(resultado));
}

export async function getConfirmacionPropia(req: Request, res: Response): Promise<void> {
  const cliente = requireCliente(req);
  const resultado = await obtenerConfirmacionPropia(cliente.idinvitacion);
  res.status(200).json(ConfirmacionPropiaResponseSchema.parse(resultado));
}

export async function patchConfirmacionPropia(req: Request, res: Response): Promise<void> {
  const cliente = requireCliente(req);
  const body = EditarConfirmacionRequestSchema.parse(req.body);
  const resultado = await editarConfirmacion(cliente.idinvitacion, cliente.email, body);
  res.status(200).json(EditarConfirmacionResponseSchema.parse(resultado));
}

export async function postCancelarConfirmacionPropia(req: Request, res: Response): Promise<void> {
  const cliente = requireCliente(req);
  const resultado = await cancelarConfirmacion(cliente.idinvitacion, cliente.email);
  res.status(200).json(CancelarConfirmacionResponseSchema.parse(resultado));
}
