import {
  ActualizarConfiguracionEventoRequestSchema,
  ActualizarSlotRequestSchema,
  ConfiguracionEventoSchema,
  CrearSlotRequestSchema,
  SlotAdminSchema,
  SlotsAdminResponseSchema,
  SlotsResponseSchema,
  UuidSchema,
} from "@event-promotion/shared-types";
import type { Request, Response } from "express";
import {
  actualizarDiasDeadlineEdicion,
  actualizarSlot,
  crearSlot,
  desactivarSlot,
  leerDiasDeadlineEdicion,
  listarSlotsActivos,
  listarSlotsAdmin,
} from "./service.js";

export async function getSlots(_req: Request, res: Response): Promise<void> {
  const slots = await listarSlotsActivos();
  res.status(200).json(SlotsResponseSchema.parse(slots));
}

export async function getSlotsAdmin(_req: Request, res: Response): Promise<void> {
  const slots = await listarSlotsAdmin();
  res.status(200).json(SlotsAdminResponseSchema.parse(slots));
}

export async function postSlot(req: Request, res: Response): Promise<void> {
  const body = CrearSlotRequestSchema.parse(req.body);
  const slot = await crearSlot(body);
  res.status(201).json(SlotAdminSchema.parse(slot));
}

export async function patchSlot(req: Request, res: Response): Promise<void> {
  const idslot = UuidSchema.parse(req.params.id);
  const body = ActualizarSlotRequestSchema.parse(req.body);
  const slot = await actualizarSlot(idslot, body);
  res.status(200).json(SlotAdminSchema.parse(slot));
}

export async function deleteSlot(req: Request, res: Response): Promise<void> {
  const idslot = UuidSchema.parse(req.params.id);
  await desactivarSlot(idslot);
  res.status(204).send();
}

export async function getConfiguracionEvento(_req: Request, res: Response): Promise<void> {
  const dias = await leerDiasDeadlineEdicion();
  res.status(200).json(ConfiguracionEventoSchema.parse({ diasDeadlineEdicion: dias }));
}

export async function patchConfiguracionEvento(req: Request, res: Response): Promise<void> {
  const body = ActualizarConfiguracionEventoRequestSchema.parse(req.body);
  const config = await actualizarDiasDeadlineEdicion(body.diasDeadlineEdicion);
  res.status(200).json(ConfiguracionEventoSchema.parse(config));
}
