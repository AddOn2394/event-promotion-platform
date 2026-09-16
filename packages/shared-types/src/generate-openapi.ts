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
  ConfirmarAsistenciaItemSchema,
  ConfirmarAsistenciaRequestSchema,
  ConfirmarAsistenciaResponseSchema,
} from "./confirmaciones.js";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.register("ConfirmarAsistenciaItem", ConfirmarAsistenciaItemSchema);
const RequestSchema = registry.register(
  "ConfirmarAsistenciaRequest",
  ConfirmarAsistenciaRequestSchema,
);
const ResponseSchema = registry.register(
  "ConfirmarAsistenciaResponse",
  ConfirmarAsistenciaResponseSchema,
);

registry.registerPath({
  method: "post",
  path: "/confirmaciones",
  description: "HU-3 / HU-7 — confirmar (o reconfirmar) asistencia",
  request: {
    body: {
      content: {
        "application/json": {
          schema: RequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Confirmación registrada — subtotales, % de descuento y total en centavos",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
    400: {
      description: "Selección vacía o slotId inválido — rechazado por el schema compartido (HU-3, G0)",
    },
    409: {
      description: "Ya existe una confirmación 'confirmada' para esta invitación (HU-3/HU-7 vía PATCH, no un segundo POST)",
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
