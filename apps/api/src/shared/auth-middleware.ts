import type { NextFunction, Request, Response } from "express";
import { ADMIN_COOKIE_NAME, CLIENTE_COOKIE_NAME } from "./cookies.js";
import { verifyAdminToken, verifyClienteToken, type AdminTokenPayload, type ClienteTokenPayload } from "./jwt.js";

declare global {
  namespace Express {
    interface Request {
      cliente?: ClienteTokenPayload;
      admin?: AdminTokenPayload;
    }
  }
}

export function requireClienteAuth(req: Request, res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.[CLIENTE_COOKIE_NAME];
  const payload = typeof token === "string" ? verifyClienteToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  req.cliente = payload;
  next();
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.[ADMIN_COOKIE_NAME];
  const payload = typeof token === "string" ? verifyAdminToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  req.admin = payload;
  next();
}
