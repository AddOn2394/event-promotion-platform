import { SlotsResponseSchema } from "@event-promotion/shared-types";
import type { Request, Response } from "express";
import { listarSlotsActivos } from "./service.js";

export async function getSlots(_req: Request, res: Response): Promise<void> {
  const slots = await listarSlotsActivos();
  res.status(200).json(SlotsResponseSchema.parse(slots));
}
