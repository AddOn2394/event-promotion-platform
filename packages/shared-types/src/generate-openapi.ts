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
  ListarConfirmacionesAdminResponseSchema,
  ListarInvitacionesResponseSchema,
  ReenviarCodigoResponseSchema,
} from "./admin.js";
import { LoginClienteRequestSchema, LoginClienteResponseSchema } from "./auth.js";
import {
  ActualizarCatalogoItemRequestSchema,
  CatalogoAdminResponseSchema,
  CatalogoItemAdminSchema,
  CatalogoResponseSchema,
  CrearCatalogoItemRequestSchema,
} from "./catalogo.js";
import { ActualizarConfiguracionEventoRequestSchema, ConfiguracionEventoSchema } from "./configuracion.js";
import {
  CancelarConfirmacionResponseSchema,
  ConfirmacionPropiaResponseSchema,
  ConfirmarAsistenciaItemSchema,
  ConfirmarAsistenciaRequestSchema,
  ConfirmarAsistenciaResponseSchema,
  EditarConfirmacionRequestSchema,
  EditarConfirmacionResponseSchema,
} from "./confirmaciones.js";
import { ActualizarConfiguracionDescuentoRequestSchema, ConfiguracionDescuentoSchema } from "./descuento.js";
import {
  ActualizarSlotRequestSchema,
  CrearSlotRequestSchema,
  SlotAdminSchema,
  SlotsAdminResponseSchema,
  SlotsResponseSchema,
} from "./slots.js";

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
const ConfiguracionDescuentoSchemaRef = registry.register(
  "ConfiguracionDescuento",
  ConfiguracionDescuentoSchema,
);
const LoginClienteReqSchema = registry.register("LoginClienteRequest", LoginClienteRequestSchema);
const LoginClienteResSchema = registry.register("LoginClienteResponse", LoginClienteResponseSchema);
const AdminLoginReqSchema = registry.register("AdminLoginRequest", AdminLoginRequestSchema);
const AdminLoginResSchema = registry.register("AdminLoginResponse", AdminLoginResponseSchema);
const CrearInvitacionReqSchema = registry.register("CrearInvitacionRequest", CrearInvitacionRequestSchema);
const CrearInvitacionResSchema = registry.register("CrearInvitacionResponse", CrearInvitacionResponseSchema);
const EditarRequestSchema = registry.register("EditarConfirmacionRequest", EditarConfirmacionRequestSchema);
const EditarResponseSchema = registry.register("EditarConfirmacionResponse", EditarConfirmacionResponseSchema);
const CancelarResponseSchema = registry.register("CancelarConfirmacionResponse", CancelarConfirmacionResponseSchema);
const ConfirmacionPropiaSchema = registry.register("ConfirmacionPropiaResponse", ConfirmacionPropiaResponseSchema);

// Gate 5 (HU-8 a HU-12, ADR-024/ADR-007/ADR-009/ADR-010/ADR-023).
const ListarInvitacionesResSchema = registry.register("ListarInvitacionesResponse", ListarInvitacionesResponseSchema);
const ReenviarCodigoResSchema = registry.register("ReenviarCodigoResponse", ReenviarCodigoResponseSchema);
const ListarConfirmacionesAdminResSchema = registry.register(
  "ListarConfirmacionesAdminResponse",
  ListarConfirmacionesAdminResponseSchema,
);
const CatalogoAdminResSchema = registry.register("CatalogoAdminResponse", CatalogoAdminResponseSchema);
const CatalogoItemAdminResSchema = registry.register("CatalogoItemAdmin", CatalogoItemAdminSchema);
const CrearCatalogoItemReqSchema = registry.register("CrearCatalogoItemRequest", CrearCatalogoItemRequestSchema);
const ActualizarCatalogoItemReqSchema = registry.register(
  "ActualizarCatalogoItemRequest",
  ActualizarCatalogoItemRequestSchema,
);
const SlotsAdminResSchema = registry.register("SlotsAdminResponse", SlotsAdminResponseSchema);
const SlotAdminResSchema = registry.register("SlotAdmin", SlotAdminSchema);
const CrearSlotReqSchema = registry.register("CrearSlotRequest", CrearSlotRequestSchema);
const ActualizarSlotReqSchema = registry.register("ActualizarSlotRequest", ActualizarSlotRequestSchema);
const ConfiguracionEventoResSchema = registry.register("ConfiguracionEvento", ConfiguracionEventoSchema);
const ActualizarConfiguracionEventoReqSchema = registry.register(
  "ActualizarConfiguracionEventoRequest",
  ActualizarConfiguracionEventoRequestSchema,
);
const ActualizarConfiguracionDescuentoReqSchema = registry.register(
  "ActualizarConfiguracionDescuentoRequest",
  ActualizarConfiguracionDescuentoRequestSchema,
);

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
    401: { description: "Email, código inválido o código expirado (mensaje genérico, sin enumeration, ADR-011)" },
    429: { description: "5+ intentos fallidos en 15 minutos para ese email (ADR-022, sin importar la IP)" },
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
  method: "get",
  path: "/configuracion-descuento",
  description:
    "ADR-025 — umbrales vigentes del motor de descuento, para el preview en vivo de apps/web (requiere sesión de cliente)",
  responses: {
    200: {
      description: "Configuración vigente",
      content: { "application/json": { schema: ConfiguracionDescuentoSchemaRef } },
    },
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
      description: "Ya existe una confirmación 'confirmada' para esta invitación (editar es PATCH, HU-4/HU-5)",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/confirmaciones/mia",
  description: "HU-4/HU-5 — selección/slot/estado vigentes de la propia invitación (requiere sesión de cliente)",
  responses: {
    200: { description: "Confirmación propia", content: { "application/json": { schema: ConfirmacionPropiaSchema } } },
    401: { description: "Sin sesión de cliente" },
    404: { description: "La invitación todavía no tiene ninguna confirmación" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/confirmaciones/mia",
  description: "HU-4/HU-5 — editar selección y/o cambiar de slot antes del deadline (requiere sesión de cliente)",
  request: { body: { content: { "application/json": { schema: EditarRequestSchema } } } },
  responses: {
    200: { description: "Confirmación actualizada", content: { "application/json": { schema: EditarResponseSchema } } },
    400: { description: "Deadline de edición cerrado, slotId/ítem inválido, o slot destino sin cupo" },
    401: { description: "Sin sesión de cliente" },
    404: { description: "No existe una confirmación para editar" },
    409: { description: "La confirmación está cancelada — reconfirmar con POST /confirmaciones (HU-7)" },
  },
});

registry.registerPath({
  method: "post",
  path: "/confirmaciones/mia/cancelar",
  description: "HU-6 — cancelar asistencia antes del deadline (requiere sesión de cliente)",
  responses: {
    200: { description: "Confirmación cancelada", content: { "application/json": { schema: CancelarResponseSchema } } },
    400: { description: "Deadline de edición cerrado" },
    401: { description: "Sin sesión de cliente" },
    404: { description: "No existe una confirmación para cancelar" },
    409: { description: "La confirmación ya estaba cancelada" },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/invitaciones",
  description: "HU-11 — listado de invitaciones con estado (confirmada/cancelada/sin_respuesta/rebotada), requiere sesión de admin",
  responses: {
    200: { description: "Invitaciones", content: { "application/json": { schema: ListarInvitacionesResSchema } } },
    401: { description: "Sin sesión de admin" },
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/invitaciones/{id}/reenviar",
  description: "HU-11 (ADR-026) — reenviar código: genera uno nuevo, invalida el anterior. Requiere sesión de admin",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Código reenviado", content: { "application/json": { schema: ReenviarCodigoResSchema } } },
    401: { description: "Sin sesión de admin" },
    404: { description: "Invitación no encontrada" },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/confirmaciones",
  description: "HU-8 — listado filtrable por estado (query ?estado=), requiere sesión de admin",
  request: { query: z.object({ estado: z.enum(["confirmada", "cancelada", "sin_respuesta", "rebotada"]).optional() }) },
  responses: {
    200: {
      description: "Confirmaciones/invitaciones con su estado",
      content: { "application/json": { schema: ListarConfirmacionesAdminResSchema } },
    },
    401: { description: "Sin sesión de admin" },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/confirmaciones/export.csv",
  description: "HU-8 (ADR-013) — export CSV con columnas fijas, snapshot congelado (ADR-006). Requiere sesión de admin",
  responses: {
    200: { description: "Archivo CSV" },
    401: { description: "Sin sesión de admin" },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/catalogo",
  description: "HU-9 — catálogo completo incl. inactivos, requiere sesión de admin",
  responses: {
    200: { description: "Catálogo", content: { "application/json": { schema: CatalogoAdminResSchema } } },
    401: { description: "Sin sesión de admin" },
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/catalogo",
  description: "HU-9 — crear ítem de catálogo, requiere sesión de admin",
  request: { body: { content: { "application/json": { schema: CrearCatalogoItemReqSchema } } } },
  responses: {
    201: { description: "Ítem creado", content: { "application/json": { schema: CatalogoItemAdminResSchema } } },
    401: { description: "Sin sesión de admin" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/catalogo/{id}",
  description: "HU-9 — reemplazo completo del ítem (incl. activo, para reactivar), requiere sesión de admin",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: ActualizarCatalogoItemReqSchema } } },
  },
  responses: {
    200: { description: "Ítem actualizado", content: { "application/json": { schema: CatalogoItemAdminResSchema } } },
    401: { description: "Sin sesión de admin" },
    404: { description: "Ítem no encontrado" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/admin/catalogo/{id}",
  description: "HU-9 (ADR-007) — soft-delete (activo=false), requiere sesión de admin",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Desactivado" },
    401: { description: "Sin sesión de admin" },
    404: { description: "Ítem no encontrado" },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/slots",
  description: "HU-10 — slots completos incl. inactivos, requiere sesión de admin",
  responses: {
    200: { description: "Slots", content: { "application/json": { schema: SlotsAdminResSchema } } },
    401: { description: "Sin sesión de admin" },
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/slots",
  description: "HU-10 — crear slot, requiere sesión de admin",
  request: { body: { content: { "application/json": { schema: CrearSlotReqSchema } } } },
  responses: {
    201: { description: "Slot creado", content: { "application/json": { schema: SlotAdminResSchema } } },
    401: { description: "Sin sesión de admin" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/slots/{id}",
  description:
    "HU-10 (ADR-009) — reemplazo completo del slot; reducir cupoMaximo por debajo de las reservas actuales se rechaza. Requiere sesión de admin",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: ActualizarSlotReqSchema } } },
  },
  responses: {
    200: { description: "Slot actualizado", content: { "application/json": { schema: SlotAdminResSchema } } },
    400: { description: "Nuevo cupoMaximo menor que las reservas actuales" },
    401: { description: "Sin sesión de admin" },
    404: { description: "Slot no encontrado" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/admin/slots/{id}",
  description: "HU-10 (ADR-007) — soft-delete (activo=false), requiere sesión de admin",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Desactivado" },
    401: { description: "Sin sesión de admin" },
    404: { description: "Slot no encontrado" },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/configuracion",
  description: "HU-10 (ADR-010) — N días de deadline de edición, requiere sesión de admin",
  responses: {
    200: { description: "Configuración vigente", content: { "application/json": { schema: ConfiguracionEventoResSchema } } },
    401: { description: "Sin sesión de admin" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/configuracion",
  description: "HU-10 (ADR-010) — actualizar N días de deadline, requiere sesión de admin",
  request: { body: { content: { "application/json": { schema: ActualizarConfiguracionEventoReqSchema } } } },
  responses: {
    200: { description: "Configuración actualizada", content: { "application/json": { schema: ConfiguracionEventoResSchema } } },
    401: { description: "Sin sesión de admin" },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/configuracion/descuento",
  description: "HU-12 (ADR-023) — umbrales de descuento vigentes, requiere sesión de admin",
  responses: {
    200: { description: "Configuración vigente", content: { "application/json": { schema: ConfiguracionDescuentoSchemaRef } } },
    401: { description: "Sin sesión de admin" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/configuracion/descuento",
  description:
    "HU-12 (ADR-023) — actualizar umbrales; rechaza 5% más débil que 3% (coherencia validada en el schema). Requiere sesión de admin",
  request: { body: { content: { "application/json": { schema: ActualizarConfiguracionDescuentoReqSchema } } } },
  responses: {
    200: { description: "Configuración actualizada", content: { "application/json": { schema: ConfiguracionDescuentoSchemaRef } } },
    400: { description: "Umbral de 5% más débil que el de 3% para alguna categoría" },
    401: { description: "Sin sesión de admin" },
  },
});

registry.registerPath({
  method: "post",
  path: "/webhooks/resend",
  description: "ADR-024 — webhook de Resend (firmado con Svix), actualiza notificaciones.estado_envio. Sin auth de sesión",
  responses: {
    200: { description: "Procesado" },
    400: { description: "Firma inválida" },
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
