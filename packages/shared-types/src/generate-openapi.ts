import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";
import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import {
  AdminLoginRequestSchema,
  AdminLoginResponseSchema,
  CrearInvitacionRequestSchema,
  CrearInvitacionResponseSchema,
} from "./admin.js";
import { LoginClienteRequestSchema, LoginClienteResponseSchema } from "./auth.js";
import { CatalogoResponseSchema } from "./catalogo.js";
import {
  ConfirmarAsistenciaItemSchema,
  ConfirmarAsistenciaRequestSchema,
  ConfirmarAsistenciaResponseSchema,
} from "./confirmaciones.js";
import { SlotsResponseSchema } from "./slots.js";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.register("ConfirmarAsistenciaItem", ConfirmarAsistenciaItemSchema);
const ConfirmarRequestSchema = registry.register(
  "ConfirmarAsistenciaRequest",
  ConfirmarAsistenciaRequestSchema,
);
const ConfirmarResponseSchema = registry.register(
  "ConfirmarAsistenciaResponse",
  ConfirmarAsistenciaResponseSchema,
);
const CatalogoSchema = registry.register("CatalogoResponse", CatalogoResponseSchema);
const SlotsSchema = registry.register("SlotsResponse", SlotsResponseSchema);
const LoginClienteReqSchema = registry.register("LoginClienteRequest", LoginClienteRequestSchema);
const LoginClienteResSchema = registry.register("LoginClienteResponse", LoginClienteResponseSchema);
const AdminLoginReqSchema = registry.register("AdminLoginRequest", AdminLoginRequestSchema);
const AdminLoginResSchema = registry.register("AdminLoginResponse", AdminLoginResponseSchema);
const CrearInvitacionReqSchema = registry.register("CrearInvitacionRequest", CrearInvitacionRequestSchema);
const CrearInvitacionResSchema = registry.register("CrearInvitacionResponse", CrearInvitacionResponseSchema);

registry.registerPath({
  method: "post",
  path: "/admin/auth/login",
  description: "Login de ventas (ADR-013) — JWT en cookie httpOnly",
  request: { body: { content: { "application/json": { schema: AdminLoginReqSchema } } } },
  responses: {
    200: { description: "Login exitoso", content: { "application/json": { schema: AdminLoginResSchema } } },
    401: { description: "Credenciales inválidas (mensaje genérico, sin enumeration)" },
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/invitaciones",
  description: "HU-1 — crear invitación (requiere sesión de admin)",
  request: { body: { content: { "application/json": { schema: CrearInvitacionReqSchema } } } },
  responses: {
    201: {
      description: "Invitación creada, código enviado por email",
      content: { "application/json": { schema: CrearInvitacionResSchema } },
    },
    401: { description: "Sin sesión de admin" },
    409: { description: "Ya existe una invitación para ese email (HU-1)" },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  description: "HU-2 — login de cliente por email + código de 6 dígitos",
  request: { body: { content: { "application/json": { schema: LoginClienteReqSchema } } } },
  responses: {
    200: { description: "Login exitoso", content: { "application/json": { schema: LoginClienteResSchema } } },
    401: { description: "Email o código inválido (mensaje genérico, sin enumeration, ADR-011)" },
  },
});

registry.registerPath({
  method: "get",
  path: "/catalogo",
  description: "HU-3 (ADR-012) — catálogo activo, requiere sesión de cliente",
  responses: {
    200: { description: "Catálogo activo", content: { "application/json": { schema: CatalogoSchema } } },
    401: { description: "Sin sesión de cliente" },
  },
});

registry.registerPath({
  method: "get",
  path: "/slots",
  description: "HU-3 (ADR-008) — slots activos, requiere sesión de cliente",
  responses: {
    200: { description: "Slots activos", content: { "application/json": { schema: SlotsSchema } } },
    401: { description: "Sin sesión de cliente" },
  },
});

registry.registerPath({
  method: "post",
  path: "/confirmaciones",
  description: "HU-3 — confirmar asistencia (requiere sesión de cliente)",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ConfirmarRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Confirmación registrada — subtotales, % de descuento y total en centavos",
      content: {
        "application/json": {
          schema: ConfirmarResponseSchema,
        },
      },
    },
    400: {
      description: "Selección vacía, slotId inválido, o ítem/slot ya no disponible",
    },
    401: { description: "Sin sesión de cliente" },
    409: {
      description: "Ya existe una confirmación para esta invitación (HU-4/HU-5/HU-7 vía PATCH, no un segundo POST)",
    },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);

const document = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    title: "Feria de Promociones — API",
    version: "0.0.0",
  },
});

const outDir = fileURLToPath(new URL("../", import.meta.url));
const outPath = path.join(outDir, "openapi.json");

writeFileSync(outPath, JSON.stringify(document, null, 2) + "\n", "utf-8");

console.log(`OpenAPI generado en ${outPath}`);
