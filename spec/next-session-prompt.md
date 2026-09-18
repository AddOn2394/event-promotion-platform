# Prompt — Próxima sesión: Gate 6 (Endurecimiento final)

Continuamos `event-promotion-platform`. **Gate 5 (admin panel completo) está cerrado** — ver `spec/ESTADO_PLAN.md` y `spec/todo.md`, entrada "2026-09-17 (Gate 5 — Admin panel completo: CERRADO)". Esta sesión es **Gate 6, el último gate del plan** (`spec/PLAN_DESARROLLO.md`).

**Pendiente arrastrado, no bloqueante pero confirmar antes de asumir que producción refleja el código actual**: ninguna rama con Gate 2-5 está desplegada en Render todavía. No se confirmó que las variables de entorno (`JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FRONTEND_URL`, `COOKIE_SECURE`, `RESEND_WEBHOOK_SECRET`) estén seteadas en el dashboard de Render, ni que el webhook esté registrado en el dashboard de Resend (URL + secreto). Si esta sesión toca algo que se vaya a verificar en producción, confirmar eso primero — y si el usuario quiere desplegar como parte de este gate, es la primera vez que se hace desde Gate 1.

Lee antes de escribir código: `spec/PLAN_DESARROLLO.md` Gate 6 (sección "Gate 6 — Endurecimiento final"), y repasa `spec/DECISIONES_ARQUITECTURA.md` completo — este gate revisa el branch entero, no un diff aislado, así que cualquier ADR es potencialmente relevante. `spec/ESTADO_PLAN.md` §3 tiene el resumen de decisiones cerradas que no hay que reabrir.

No pidas confirmación entre pasos salvo que algo del spec sea ambiguo o contradiga lo que encuentres en el código — en ese caso, detente y pregunta, no asumas.

## Qué falta construir

Gate 6 es endurecimiento, no features nuevas — no agregar alcance que el spec no pida.

1. **`/code-review` end-to-end sobre el branch completo** (no solo el último diff) — el exit criterio lo pide explícitamente, distinto de los code-reviews por gate que ya se hicieron. Cubre todo: Gate 0 a Gate 5.
2. **Accesibilidad básica del formulario público** (`ConfirmarPage`, `EditarPage`, `LoginPage` del cliente — no el admin panel, que no lo pide el spec): labels asociados a cada input, foco visible, contraste suficiente, navegación completa por teclado. **No** es una auditoría AXE completa — ese requisito venía del `CLAUDE.md` de Angular que ya se reemplazó (ADR-001), nunca lo pidió el PDF ni el líder del proyecto explícitamente. No agregar tooling de accesibilidad (axe-core, etc.) para esto.
3. **Limpieza de código muerto/TODOs pendientes** — grep por `TODO`/`FIXME`/`PLACEHOLDER` en `apps/api/src`, `apps/web/src`, `packages/shared-types/src`. Nota: `apps/api/src/db/seed.ts` tiene catálogo y slots marcados `(PLACEHOLDER)` a propósito (pendiente del listado real de servicios/productos/horarios del evento) — confirmar con el usuario si ya tiene los datos reales antes de tocar ese seed, no asumir que "limpieza" significa reemplazarlos sin esos datos en mano.
4. **`README.md` del repo actualizado** con instrucciones de setup local (`docker compose up`, migraciones, seed, variables de entorno) y link de la demo pública — el link solo si Gate 1-5 ya está desplegado y verificado en Render (ver el pendiente arrastrado arriba); si no, decirlo explícitamente en vez de inventar una URL.
5. **Walkthrough consolidado de todas las fases** (Gate 0 a Gate 6) — no es lo mismo que los walkthroughs por gate que ya existen en `spec/todo.md`; es un resumen de cierre del proyecto completo.

## Dos juicios de negocio dejados abiertos en Gate 5 — considerar si tocarlos acá

Ver `spec/todo.md`, entrada de Gate 5, sección "Pendiente explícito":
- `auth/service.ts`: un login con email+código correctos pero evento ya terminado (`codigoExpirado`) cuenta como intento fallido hacia el rate limiting (ADR-022) — ¿debería? No decidido, dejado a propósito porque es una llamada de negocio, no un bug obvio.
- `apps/web`: `useEditarConfirmacion`/`useCancelarConfirmacion` no invalidan la query `confirmacion-propia` de TanStack Query — hoy inofensivo (`staleTime: 0`), pero frágil si una pantalla futura mantiene esa query montada. No es un bug visible hoy, es deuda técnica menor.

No hay obligación de resolver ninguno de los dos en Gate 6 — el spec no lo pide — pero si el `/code-review` end-to-end los vuelve a encontrar, ya están documentados, no hace falta re-investigarlos desde cero.

## Checklist de cierre del gate — no te lo saltees

1. `/code-review` sobre el branch completo (no un diff).
2. `advisor`.
3. Walkthrough consolidado en `spec/todo.md` (fecha de hoy).
4. Actualiza `spec/ESTADO_PLAN.md`: G6 pasa a "cerrado" — es el último gate, no hay "próximo paso" de features después de este.
5. Cierra/comenta los issues de GitHub del milestone "G6 - Endurecimiento final": **#35** ("[Backend] G6: Revision de codigo final + tests de integracion completos"), **#36** ("[Frontend] G6: Accesibilidad basica + walkthrough + limpieza + README") — confirmado con `gh issue list --milestone "G6 - Endurecimiento final"` el 2026-09-17, ambos siguen `OPEN`.
6. Detente.

## Contexto que ya no hace falta redecidir

- Todas las decisiones de ADR-001 a ADR-027 (`spec/DECISIONES_ARQUITECTURA.md`) — Gate 6 revisa el código contra ellas, no las reabre salvo contradicción real encontrada durante la revisión.
- `packages/shared-types` sigue siendo la única fuente del contrato (ADR-003).
- El mecanismo de rate limiting por email con `scope` (`cliente`/`admin`, migración 0011) ya está cerrado desde Gate 5 — no rediseñar.
- El CSV de HU-8 emite una sola columna `nombre`, sin `apellidos` (ADR-027) — no reabrir.
- Las credenciales/secrets van siempre por variables de entorno.
- `packages/shared-types/openapi.json` se commitea, regenerar con `npm run generate:openapi -w packages/shared-types` si se toca algún schema (poco probable en Gate 6, que no agrega endpoints).

**No hagas commit.** El usuario comitea siempre — deja el árbol de trabajo listo y dilo explícitamente al terminar.
