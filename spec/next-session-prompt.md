# Prompt — Próxima sesión: Gate 0

Continuamos `event-promotion-platform`. Lee antes de escribir código: `spec/ESTADO_PLAN.md`, `spec/DECISIONES_ARQUITECTURA.md` (ADR-003, ADR-020, ADR-021), `spec/SPEC_FUNCIONAL.md` §7-8, `spec/PLAN_DESARROLLO.md` Gate 0.

Ejecuta en este orden. No pidas confirmación entre pasos salvo que algo del spec sea ambiguo o contradiga lo que encuentres en el código — en ese caso, detente y pregunta, no asumas.

1. En `packages/shared-types/src/`, define los schemas Zod `ConfirmarAsistenciaRequestSchema` / `ConfirmarAsistenciaResponseSchema` según `spec/SPEC_FUNCIONAL.md` HU-3: request = `{ items: { catalogoItemId: string, categoria: 'servicio'|'producto' }[], slotId: string }` (mínimo 1 item, ver criterio de aceptación correspondiente); response = subtotales + % descuento + total, todo en centavos enteros. Exporta los tipos inferidos (`z.infer<...>`).
2. Crea `packages/shared-types/src/generate-openapi.ts` usando `@asteasolutions/zod-to-openapi` para generar el spec OpenAPI a partir de esos schemas. Ejecuta el script (`npm run generate:openapi -w packages/shared-types` — agrega el script al `package.json` si no existe) y confirma que produce un archivo OpenAPI válido.
3. Desde `apps/api`, importa `ConfirmarAsistenciaRequestSchema` y úsalo para validar el body de un endpoint placeholder (el endpoint real `POST /confirmaciones` es trabajo de Gate 2 — aquí solo se prueba que el import + `safeParse` funcionan).
4. Desde `apps/web`, importa el mismo schema y úsalo con `@hookform/resolvers/zod` en un formulario placeholder (mismo criterio: solo probar que compila y valida).
5. Corre `npm install` y `npm run build` en la raíz. Confirma que `apps/web` y `apps/api` compilan sin error importando `@event-promotion/shared-types`.
6. Cierra el gate: corre los tests que existan → pide `/code-review` sobre el diff → llama al `advisor` → escribe un párrafo de walkthrough en `spec/todo.md` (fecha de hoy) explicando qué se hizo y por qué → actualiza `spec/ESTADO_PLAN.md` (G0 pasa a "cerrado", próximo paso = G1) → detente.

No implementes lógica de negocio real (motor de descuento, endpoints de confirmación, UI de formulario real) en este gate — eso es Gate 2 (issues en GitHub, milestone "G2 - Nucleo del PDF"). Este gate es exclusivamente el contrato.

**No hagas commit.** El usuario comitea siempre — deja el árbol de trabajo listo y dilo explícitamente al terminar.
