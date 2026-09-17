# Prompt — Próxima sesión: Gate 3 (cupo atómico por slot)

Continuamos `event-promotion-platform`. **Gate 2 (Núcleo del PDF) está cerrado completo** (sesiones A+B+C) — backend de los 5 dominios, formulario web completo (login admin, invitar, login cliente, confirmar con preview de descuento), verificado en navegador real de punta a punta. Ver `spec/todo.md`, entrada "2026-09-17 (Gate 2 — sesión C)", y `spec/ESTADO_PLAN.md`.

**Pendiente de Gate 2, no bloqueante para empezar Gate 3 pero confirmar antes de asumir que producción refleja el código actual**: la rama de Gate 2 (incluyendo `GET /configuracion-descuento`, agregado en sesión C) **no está desplegada en Render todavía**, y no se confirmó que las variables nuevas (`JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FRONTEND_URL`, `COOKIE_SECURE`) estén seteadas en el dashboard de Render. Si esta sesión toca algo que se vaya a verificar en producción, confirmar eso primero.

Lee antes de escribir código: `spec/PLAN_DESARROLLO.md` Gate 3 (sección "Gate 3 — Cupo atómico por slot"), `spec/DECISIONES_ARQUITECTURA.md` ADR-009 (cupo por slot: contador atómico, único mecanismo de escritura, orden de lock determinista) y ADR-008 (slots, ya cerrado en Gate 2). `spec/SPEC_FUNCIONAL.md` para el criterio de aceptación exacto de mostrar cupos disponibles.

No pidas confirmación entre pasos salvo que algo del spec sea ambiguo o contradiga lo que encuentres en el código — en ese caso, detente y pregunta, no asumas.

## Qué falta construir

1. **Migración** `apps/api/migrations/0008_slots_cupos_disponibles.sql` (siguiente número en la secuencia — ver `apps/api/migrations/`, van del `0001` al `0007`): agrega `cupos_disponibles INTEGER NOT NULL` a `slots`, con `CHECK (cupos_disponibles >= 0)` (ADR-009). Backfill de las filas existentes con `cupos_disponibles = cupo_maximo` (la columna `cupo_maximo` ya existe desde Gate 2, ver `apps/api/migrations/0002_slots.sql`).
2. **`apps/api/src/slots/service.ts`**: `listarSlotsActivos` (o como se llame la función actual) debe devolver también `cuposDisponibles` — informativo, nunca autoritativo (ADR-009 punto 1). Extender `SlotSchema` en `packages/shared-types/src/slots.ts` con `cuposDisponibles: z.number().int().nonnegative()`, regenerar OpenAPI.
3. **`apps/api/src/registration/service.ts`** (`confirmarAsistencia`): el `INSERT` a `confirmaciones` debe ir precedido, **dentro de la misma transacción**, de `UPDATE slots SET cupos_disponibles = cupos_disponibles - 1 WHERE id = $1 AND cupos_disponibles > 0` (patrón exacto de ADR-009 punto 2). Si el `UPDATE` afecta 0 filas, abortar la transacción completa y responder 400 "cupo lleno, elige otro horario" (mismo patrón que la validación de slot/ítem inexistente que ya existe ahí) — **nunca** un read-then-write con gap entre leer `cupos_disponibles` y decidir si hay cupo (CLAUDE.md lo prohíbe explícitamente).
4. **`apps/web`**: `SlotSelector` (`apps/web/src/registration/components/SlotSelector.tsx`) muestra los cupos disponibles junto a cada horario — informativo únicamente, con alguna indicación visual si un slot está en 0 (deshabilitarlo en el `<select>` es razonable, pero el servidor sigue siendo quien rechaza si dos clientes lo agotan a la vez entre que el cliente cargó la página y envió el formulario).
5. **Test de concurrencia real** (el criterio de salida lo pide explícito, no es opcional): un slot con `cupo_maximo=1`/`cupos_disponibles=1`, dos `POST /confirmaciones` disparados con **dos conexiones/transacciones simultáneas reales** (no secuencial — usar dos clientes `pg` o dos requests `supertest` lanzados con `Promise.all` contra invitaciones distintas apuntando al mismo slot), y confirmar que exactamente una sale 201 y la otra 400 por cupo lleno, y que `cupos_disponibles` termina en 0 (nunca negativo, nunca sin decrementar).

## Checklist de cierre del gate — no te lo saltees

1. Tests (el de concurrencia de arriba es el que prueba la invariante real — todos los demás tests de integración existentes de `apps/api` deben seguir en verde).
2. `/code-review` sobre el diff de Gate 3.
3. `advisor`.
4. Walkthrough en `spec/todo.md` (fecha de hoy).
5. Actualiza `spec/ESTADO_PLAN.md`: G3 pasa a "cerrado", próximo paso = G4.
6. Cierra/comenta los issues de GitHub del milestone "G3 - Cupo atomico por slot": **#13** (backend: `cupos_disponibles` + `UPDATE` atómico condicional), **#14** (frontend: mostrar cupos disponibles en selector de slot).
7. Detente.

## Contexto que ya no hace falta redecidir

- `packages/shared-types` sigue siendo la única fuente del contrato (ADR-003) — extender `SlotSchema` ahí, nunca duplicar a mano en `apps/api`/`apps/web`.
- El patrón transaccional de `confirmarAsistencia` (`withTransaction`, `apps/api/src/shared/db-transaction.ts`) ya existe — el `UPDATE` de cupo va dentro de esa misma transacción, no en una aparte.
- `SlotSchema`/`SlotsResponseSchema` (`packages/shared-types/src/slots.ts`) hoy no tienen `cuposDisponibles` — es la única extensión de schema que pide este gate.
- El `/code-review` de cierre de Gate 2 (sesión C) dejó 6 hallazgos de simplificación/eficiencia diferidos a propósito (ver `spec/todo.md`, entrada "2026-09-17 (Gate 2 — sesión C)") — no son parte de Gate 3, pero uno de ellos (el `INSERT` de `confirmacion_items` uno por uno en vez de multi-fila) toca la misma transacción que este gate va a modificar; si aparece naturalmente al tocar ese código, evaluarlo, pero no es un requisito de este gate.
- `packages/shared-types/openapi.json` se commitea, regenerar con `npm run generate:openapi -w packages/shared-types` si se toca `SlotSchema`.
- Las credenciales/secrets van siempre por variables de entorno — nunca hardcodeadas en código o config.

**No hagas commit.** El usuario comitea siempre — deja el árbol de trabajo listo y dilo explícitamente al terminar.
