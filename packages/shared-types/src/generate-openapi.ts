import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import {
  ConfirmarAsistenciaRequestSchema,
  ConfirmarAsistenciaResponseSchema,
} from "./confirmaciones.js";

const registry = new OpenAPIRegistry();

registry.register("ConfirmarAsistenciaRequest", ConfirmarAsistenciaRequestSchema);
registry.register("ConfirmarAsistenciaResponse", ConfirmarAsistenciaResponseSchema);

registry.registerPath({
  method: "post",
  path: "/confirmaciones",
  description: "HU-3 / HU-7 — confirmar (o reconfirmar) asistencia",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ConfirmarAsistenciaRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Confirmación registrada — subtotales, % de descuento y total en centavos",
      content: {
        "application/json": {
          schema: ConfirmarAsistenciaResponseSchema,
        },
      },
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
