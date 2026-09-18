import {
  ActualizarCatalogoItemRequestSchema,
  ActualizarConfiguracionDescuentoRequestSchema,
  CatalogoAdminResponseSchema,
  CatalogoItemAdminSchema,
  CatalogoResponseSchema,
  ConfiguracionDescuentoSchema,
  CrearCatalogoItemRequestSchema,
  UuidSchema,
} from "@event-promotion/shared-types";
import type { Request, Response } from "express";
import {
  actualizarCatalogoItem,
  actualizarConfiguracionDescuento,
  crearCatalogoItem,
  desactivarCatalogoItem,
  leerConfiguracionDescuentoVigente,
  listarCatalogoActivo,
  listarCatalogoAdmin,
} from "./service.js";

export async function getCatalogo(_req: Request, res: Response): Promise<void> {
  const items = await listarCatalogoActivo();
  res.status(200).json(CatalogoResponseSchema.parse(items));
}

export async function getConfiguracionDescuento(_req: Request, res: Response): Promise<void> {
  const config = await leerConfiguracionDescuentoVigente();
  res.status(200).json(ConfiguracionDescuentoSchema.parse(config));
}

export async function getCatalogoAdmin(_req: Request, res: Response): Promise<void> {
  const items = await listarCatalogoAdmin();
  res.status(200).json(CatalogoAdminResponseSchema.parse(items));
}

export async function postCatalogoItem(req: Request, res: Response): Promise<void> {
  const body = CrearCatalogoItemRequestSchema.parse(req.body);
  const item = await crearCatalogoItem(body);
  res.status(201).json(CatalogoItemAdminSchema.parse(item));
}

export async function patchCatalogoItem(req: Request, res: Response): Promise<void> {
  const idcatalogo = UuidSchema.parse(req.params.id);
  const body = ActualizarCatalogoItemRequestSchema.parse(req.body);
  const item = await actualizarCatalogoItem(idcatalogo, body);
  res.status(200).json(CatalogoItemAdminSchema.parse(item));
}

export async function deleteCatalogoItem(req: Request, res: Response): Promise<void> {
  const idcatalogo = UuidSchema.parse(req.params.id);
  await desactivarCatalogoItem(idcatalogo);
  res.status(204).send();
}

export async function patchConfiguracionDescuento(req: Request, res: Response): Promise<void> {
  const body = ActualizarConfiguracionDescuentoRequestSchema.parse(req.body);
  const config = await actualizarConfiguracionDescuento(body);
  res.status(200).json(ConfiguracionDescuentoSchema.parse(config));
}
