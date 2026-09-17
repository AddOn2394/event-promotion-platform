import { CatalogoResponseSchema } from "@event-promotion/shared-types";
import type { Request, Response } from "express";
import { listarCatalogoActivo } from "./service.js";

export async function getCatalogo(_req: Request, res: Response): Promise<void> {
  const items = await listarCatalogoActivo();
  res.status(200).json(CatalogoResponseSchema.parse(items));
}
