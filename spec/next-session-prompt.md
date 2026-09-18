# Prompt — Próxima sesión: Gate 5 (Admin panel completo)

Continuamos `event-promotion-platform`. **Gate 4 (edición, deadline, cambio de slot y cancelación) está cerrado** — ver `spec/ESTADO_PLAN.md` y `spec/todo.md`, entrada "2026-09-17 (Gate 4 — Edición, deadline, cambio de slot y cancelación: CERRADO)". Esta sesión empieza **Gate 5**, el último gate de features antes del endurecimiento final (Gate 6).

**Pendiente arrastrado, no bloqueante pero confirmar antes de asumir que producción refleja el código actual**: ninguna rama con Gate 2/3/4 está desplegada en Render todavía, y no se confirmó que las variables de entorno (`JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FRONTEND_URL`, `COOKIE_SECURE`) estén seteadas en el dashboard de Render. Si esta sesión toca algo que se vaya a verificar en producción, confirmar eso primero.

Lee antes de escribir código: `spec/PLAN_DESARROLLO.md` Gate 5 (sección "Gate 5 — Admin panel completo"), `spec/DECISIONES_ARQUITECTURA.md` ADR-007 (soft-delete), ADR-009 (cupo, para la regla de reducir `cupo_maximo`), ADR-010 (deadline configurable), ADR-013 (admin panel: invitaciones/confirmaciones/catálogo/slots/config), ADR-022 (rate limiting — este gate agrega el de login admin, el de código de cliente ya existe desde Gate 4), ADR-023 (umbrales de descuento, validación de coherencia), ADR-024 (notificaciones + webhook de Resend), ADR-026 (reenviar código genera uno nuevo). `spec/SPEC_FUNCIONAL.md` HU-8 a HU-12 para los criterios de aceptación exactos.

No pidas confirmación entre pasos salvo que algo del spec sea ambiguo o contradiga lo que encuentres en el código — en ese caso, detente y pregunta, no asumas.

## Qué falta construir

### Backend (`apps/api`)

1. **HU-8 — `GET /admin/confirmaciones` + `GET /admin/confirmaciones/export.csv`** (issue #24): listar/filtrar por 4 estados que **nunca se agrupan** (ADR-024): `confirmada`, `cancelada`, `sin respuesta` (`invitaciones.usada_en IS NULL` y sin rebote), `rebotada` (`notificaciones.estado_envio = 'rebotado'` para `tipo='invitacion'`). El CSV usa las columnas fijas de ADR-013 (nombre, apellidos, email, slot, servicios, productos, subtotal servicios, % descuento servicios, subtotal productos, % descuento productos, total, estado) y son el **snapshot congelado** (ADR-006) — nunca un recálculo contra el catálogo/config vigente.
2. **HU-9 — CRUD + soft-delete de catálogo** (issue #26): `POST/PATCH/DELETE /admin/catalogo` (el `DELETE` es soft: `activo=false`, nunca borrado físico). Un ítem desactivado sigue íntegro en `confirmacion_items` (ya lo garantiza el esquema actual — `idcatalogo` nullable, snapshot separado). Verificar con test que un ítem desactivado deja de salir en `GET /catalogo` pero las confirmaciones ya hechas no cambian.
3. **HU-10 — CRUD + soft-delete de slots + config de deadline** (issue #28): `POST/PATCH/DELETE /admin/slots` (soft-delete igual que catálogo) + `GET/PATCH /admin/configuracion` (el N de días de `configuracion_evento`, ya existe la tabla desde Gate 4 — este gate le agrega la UI/endpoint de escritura). Regla explícita de ADR-009: si el nuevo `cupo_maximo` es menor que `cupo_maximo - cupos_disponibles` (reservas actuales), el `UPDATE` se rechaza con error explícito — **nunca** ajustar `cupos_disponibles` a un valor negativo.
4. **HU-11 — Reenviar código** (issue #30): `POST /admin/invitaciones/:id/reenviar` — genera un código de 6 dígitos **nuevo** (nunca recupera el original, ADR-026), lo hashea, sobrescribe `codigo_acceso_hash`, lo envía por email. Un JWT ya emitido con el código viejo sigue válido hasta que expire (invalidar el código no revoca sesiones). Reutiliza `generarCodigoAcceso`/patrón de email de `admin/service.ts` (`crearInvitacion`) — no lo reimplementes.
5. **HU-12 — Configuración de umbrales de descuento** (issue #32): `GET/PATCH /admin/configuracion-descuento` sobre la fila única de `configuracion_descuento`. Validación al guardar: todos los mínimos ≥ 1, y **umbral de 5% nunca más débil que el de 3%** por categoría (la DB ya tiene el `CHECK` de coherencia desde Gate 2 — el endpoint debe devolver un error legible antes de que el `CHECK` lo rechace, no dejar que el cliente vea un error de Postgres crudo). Cambiar la config **no** recalcula confirmaciones ya hechas (cada una tiene su propio snapshot de umbrales, ADR-023) — verificar con test que confirmaciones viejas no cambian tras editar la config.
6. **Webhook de Resend** (issue #34): `POST /webhooks/resend` actualiza `notificaciones.estado_envio` a `enviado`/`fallido`/`rebotado` según el payload real de Resend. Revisar la documentación de eventos de Resend (`email.delivered`, `email.bounced`, etc. — confirmar los nombres exactos de evento contra la documentación real de Resend, no asumir) antes de mapear a los 3 estados de la columna. Este endpoint no lleva auth de sesión (lo llama Resend, no un usuario) — verificar si Resend firma sus webhooks (svix) y si hace falta validar la firma antes de confiar en el payload.
7. **Rate limiting de login admin** (ADR-022, arrastrado explícitamente desde Gate 4 — el ADR dice "Gate 4 (código de acceso) y Gate 5 (login admin)"): aplicar el mismo mecanismo que ya existe para `/auth/login` (`intentos_fallidos_login`, por email, 5/15min → 429) a `POST /admin/auth/login`. La tabla ya es genérica (solo `email`+`creado_en`, sin distinguir rol) — decidir si reutilizarla tal cual o si hace sentido separarla; probablemente reutilizarla es lo correcto (mismo mecanismo, ninguna razón de negocio para separar), pero confirmar que no hay una razón de seguridad para aislar los contadores de admin de los de cliente antes de decidir en silencio.

### Frontend (`apps/web`)

8. Pantalla de confirmaciones (HU-8, issue #25): tabla filtrable por los 4 estados + botón exportar CSV (puede ser un link directo al endpoint, sin necesidad de procesar el CSV en el cliente).
9. Pantalla CRUD de catálogo (HU-9, issue #27) y de slots + deadline (HU-10, issue #29): formularios simples con `react-hook-form` + los schemas Zod correspondientes (extender `packages/shared-types` si no existen ya schemas de request/response para estos endpoints — **no** existen todavía, hay que crearlos, ADR-003).
10. Botón "Reenviar código" en la pantalla de invitaciones existente (HU-11, issue #31) — mismo botón/pantalla que HU-1 (`InvitacionesPage.tsx`), per el propio ADR-026.
11. Pantalla de configuración de umbrales de descuento (HU-12, issue #33) con la validación de coherencia también en el cliente (preview, no autoritativa — el servidor sigue siendo quien valida de verdad).

### Tests (obligatorio, no opcional para cerrar el gate)

- Soft-delete: un ítem/slot desactivado no aparece en `GET /catalogo`/`GET /slots` pero sigue íntegro (snapshot) en una confirmación ya hecha.
- Reducir `cupo_maximo` por debajo de las reservas actuales se rechaza con error explícito, nunca deja `cupos_disponibles` negativo.
- Validación de coherencia de umbrales (HU-12): guardar un umbral de 5% más débil que el de 3% se rechaza con mensaje legible.
- Cambiar la configuración de descuento no recalcula confirmaciones ya hechas.
- Webhook de Resend actualiza `estado_envio` al valor correcto según cada tipo de evento del payload.
- Rate limiting de login admin: bloqueo tras 5 intentos fallidos en 15 minutos, igual que el de cliente.
- Reenviar código invalida el anterior (un login con el código viejo después de reenviar falla) pero un JWT ya emitido sigue funcionando.
- Todos los tests de integración existentes de Gate 2/3/4 siguen en verde.

## Checklist de cierre del gate — no te lo saltees

1. Tests (unitarios + integración de todo lo anterior).
2. `/code-review` sobre el diff de Gate 5.
3. `advisor`.
4. Walkthrough en `spec/todo.md` (fecha de hoy).
5. Actualiza `spec/ESTADO_PLAN.md`: G5 pasa a "cerrado", próximo paso = G6.
6. Cierra/comenta los issues de GitHub del milestone "G5 - Admin panel completo": **#24/#25** (HU-8), **#26/#27** (HU-9), **#28/#29** (HU-10), **#30/#31** (HU-11), **#32/#33** (HU-12), **#34** (webhook). No hay issue dedicado a rate limiting de login admin — mencionarlo en el walkthrough de todos modos.
7. Detente.

## Contexto que ya no hace falta redecidir

- `packages/shared-types` sigue siendo la única fuente del contrato (ADR-003) — cualquier endpoint nuevo de este gate necesita su schema Zod ahí, nunca a mano en `apps/api`/`apps/web`.
- El patrón transaccional (`withTransaction`) y el patrón de config singleton (`configuracion_descuento`/`configuracion_evento`, índice único `((true))`) ya existen — reusar, no reinventar.
- ADR-026 (reenviar genera código nuevo, no recupera el original) ya está ratificado — no reabrir esa decisión.
- El mecanismo de rate limiting por email (`intentos_fallidos_login`, sin IP) ya existe desde Gate 4 — este gate lo extiende al login admin, no lo rediseña.
- Las credenciales/secrets van siempre por variables de entorno.
- `packages/shared-types/openapi.json` se commitea, regenerar con `npm run generate:openapi -w packages/shared-types` si se toca algún schema.

**No hagas commit.** El usuario comitea siempre — deja el árbol de trabajo listo y dilo explícitamente al terminar.
