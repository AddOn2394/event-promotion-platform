import {
  AdminLoginRequestSchema,
  AdminLoginResponseSchema,
  CrearInvitacionRequestSchema,
  CrearInvitacionResponseSchema,
  ListarConfirmacionesAdminQuerySchema,
  ListarConfirmacionesAdminResponseSchema,
  ListarInvitacionesResponseSchema,
  ReenviarCodigoResponseSchema,
  UuidSchema,
} from "@event-promotion/shared-types";
import type { Request, Response } from "express";
import { ADMIN_COOKIE_NAME, adminCookieOptions } from "../shared/cookies.js";
import { signAdminToken } from "../shared/jwt.js";
import {
  crearInvitacion,
  exportarConfirmacionesCsv,
  listarConfirmacionesAdmin,
  listarInvitaciones,
  loginAdmin,
  reenviarCodigo,
} from "./service.js";

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

export async function getListarInvitaciones(_req: Request, res: Response): Promise<void> {
  const invitaciones = await listarInvitaciones();
  res.status(200).json(ListarInvitacionesResponseSchema.parse(invitaciones));
}

export async function postReenviarCodigo(req: Request, res: Response): Promise<void> {
  const idinvitacion = UuidSchema.parse(req.params.id);
  const resultado = await reenviarCodigo(idinvitacion);
  res.status(200).json(ReenviarCodigoResponseSchema.parse(resultado));
}

export async function getConfirmacionesAdmin(req: Request, res: Response): Promise<void> {
  const query = ListarConfirmacionesAdminQuerySchema.parse(req.query);
  const confirmaciones = await listarConfirmacionesAdmin(query.estado);
  res.status(200).json(ListarConfirmacionesAdminResponseSchema.parse(confirmaciones));
}

export async function getConfirmacionesAdminCsv(_req: Request, res: Response): Promise<void> {
  const csv = await exportarConfirmacionesCsv();
  res.status(200).header("Content-Type", "text/csv; charset=utf-8");
  res.header("Content-Disposition", 'attachment; filename="confirmaciones.csv"');
  res.send(csv);
}
