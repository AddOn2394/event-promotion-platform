import { CatalogoResponseSchema, ConfiguracionDescuentoSchema } from "@event-promotion/shared-types";
import type { Request, Response } from "express";
import { leerConfiguracionDescuentoVigente, listarCatalogoActivo } from "./service.js";

export async function getCatalogo(_req: Request, res: Response): Promise<void> {
  const items = await listarCatalogoActivo();
  res.status(200).json(CatalogoResponseSchema.parse(items));
}

export async function getConfiguracionDescuento(_req: Request, res: Response): Promise<void> {
  const config = await leerConfiguracionDescuentoVigente();
  res.status(200).json(ConfiguracionDescuentoSchema.parse(config));
}
