# Gate 8 — Formato numérico, comunicación profesional y estado "Fallida"

Plan completo: `C:\Users\jose_\.claude\plans\jaunty-meandering-kernighan.md`. Gate 7 (cerrado 2026-09-19) está documentado en `spec/todo.md`.

Decisiones del líder: tratamiento **usted**; formateador en `shared-types` + ADR-031; "Fallida" solo para `fallido` (pendiente sigue en "Sin respuesta", la confirmación gana); teléfono placeholder centralizado; observabilidad = solo log; guard `NODE_ENV=test` en el mailer; los 3 hallazgos de Gate 7 entran.

Orden no negociable: guard de `NODE_ENV` (bloque 2) **antes** del cambio de enum (bloque 4).

## Bloque 1 — Separador de miles
- [ ] `packages/shared-types/src/money.ts` + `money.test.ts` (fronteras ADR-005 + agrupación + precondición entero)
- [ ] `index.ts` exporta `money`; `npm run build -w packages/shared-types`
- [ ] Eliminar `apps/web/src/shared/format.ts`; migrar los 6 consumidores
- [ ] `centsAQuetzales` (CSV) intacto + comentario del porqué
- [ ] ADR-031 en `spec/DECISIONES_ARQUITECTURA.md`
- [ ] build + tests

## Bloque 2 — Correos
- [ ] `mailer.ts`: `text`, remitente legible, guard `NODE_ENV=test`
- [ ] `shared/contacto.ts` (`TELEFONO_VENTAS`) + `EDICIONES_CERRADAS` a usted
- [ ] `shared/email/html.ts` (`escaparHtml`), `documento.ts` (bloques + 2 renderers), `plantillas.ts`
- [ ] `plantillas.test.ts` (escape incl. atributo, código solo en invitación, montos, contenido)
- [ ] Ampliar retorno de `withTransaction` en confirmar/editar/cancelar (ítems, slot, deadline, nombre)
- [ ] Cablear los 6 call sites
- [ ] build + tests

## Bloque 3 — Pantallas del cliente
- [ ] `editableHastaEn` en `ConfirmarAsistenciaResponse` y `ConfirmacionPropiaResponse`; regenerar OpenAPI
- [ ] Mensajes de error del servidor a usted (`registration/service.ts`)
- [ ] `LoginPage`, `ConfirmarPage`, `EditarPage` + `CatalogoBuscador`, `CajaSeleccionados`, `SlotSelector`
- [ ] Hallazgos Gate 7: estado vacío en tablas admin, `role="status"` en cargas inline, 3 `<label>` → `<Field>`
- [ ] Actualizar tests web acoplados a texto (a propósito)
- [ ] build + tests

## Bloque 4 — "Fallida"
- [ ] ADR-030 + nota en ADR-024 + `SPEC_FUNCIONAL.md` HU-8 (4 → 5 estados)
- [ ] `admin.ts` enum, `calcularEstadoInvitacion`, etiquetas/filtro web, `InvitacionesPage` tipado
- [ ] Regenerar OpenAPI
- [ ] Tests: 5 estados (fixture SQL explícito) + reenvío exitoso limpia "Fallida"
- [ ] build + tests

## Bloque 5 — Observabilidad
- [ ] Helper único de envío + marcado + log estructurado; reemplaza los 6 `if/else`
- [ ] build + tests

## Cierre
- [ ] `npm run test` verde en 3 workspaces + `npm run build` limpio
- [ ] `/code-review` (medium)
- [ ] `advisor` pase de cierre
- [ ] `api-contract-documenter`
- [ ] Walkthrough en `spec/todo.md`, `spec/ESTADO_PLAN.md`, `tasks/lessons.md` si aplica
- [ ] `DATABASE_URL` de dev en `.env.example` y README si falta
- [ ] Sin commit — árbol listo
