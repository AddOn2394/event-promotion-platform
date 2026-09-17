# Prompt — Próxima sesión: Gate 2, sesión C (cierre del gate)

Continuamos `event-promotion-platform`. Gate 1 (deploy pipeline verde) está **cerrado**. Gate 2 se dividió en 3 sesiones — **A (DB + motor de descuento) y B (dominios de `apps/api`) ya están cerradas**, ver `spec/todo.md` entradas "2026-09-16 (Gate 2 — sesión A)" y "2026-09-17 (Gate 2 — sesión B)" antes de tocar código nuevo. Esta sesión (**C**) es la última y cierra el gate completo.

La app está desplegada en Render: `https://event-promotion-api.onrender.com` y `https://event-promotion-web.onrender.com` (free tier — cold start ~30-60s tras 15 min de inactividad). El backend de Gate 2 (5 dominios: `admin`, `auth`, `catalog`, `slots`, `registration`) está completo y probado (24 tests de integración contra Postgres real + verificación manual con `curl`/Docker) pero **no desplegado a Render todavía en esta rama** — confirmar que las variables nuevas (`JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FRONTEND_URL`, `COOKIE_SECURE`) están seteadas en el dashboard de Render antes de dar por buena la verificación en producción.

Lee antes de escribir código: `spec/ESTADO_PLAN.md`, `spec/PLAN_DESARROLLO.md` Gate 2, `spec/DECISIONES_ARQUITECTURA.md` — en particular ADR-011 (login cliente), ADR-013 (login admin), ADR-016 (React Hook Form + Zod + TanStack Query), ADR-004/ADR-012 (dos cajas en vivo + búsqueda client-side), ADR-025 (motor de descuento compartido — `apps/web` debe importar `calcularDescuento` de `@event-promotion/shared-types` para el preview, nunca reimplementarlo), ADR-026 (HU-11 corregida, no aplica a esta sesión pero no la contradigas). `spec/SPEC_FUNCIONAL.md` HU-1, HU-2, HU-3 para los criterios de aceptación exactos del frontend.

No pidas confirmación entre pasos salvo que algo del spec sea ambiguo o contradiga lo que encuentres en el código — en ese caso, detente y pregunta, no asumas.

## Qué falta construir (todo en `apps/web`)

1. **Pantalla de login admin** (`/admin/login`): email + password → `POST /admin/auth/login`. Cookie httpOnly ya la maneja el navegador solo; el frontend solo necesita mandar `credentials: "include"` en el fetch.
2. **Pantalla "Invitar cliente"** (`/admin/invitaciones`, detrás de sesión admin): email + nombre opcional → `POST /admin/invitaciones`. Mostrar éxito/error (incluyendo el 409 de email duplicado).
3. **Pantalla de login de cliente** (`/login`): email (pre-llenado desde query param del link de invitación, ver `construirLinkInvitacion` en `apps/api/src/admin/service.ts` — el formato es `/login?email=...`) + código de 6 dígitos → `POST /auth/login`. Mensaje de error genérico (el backend ya lo da, no inventar uno más específico en el frontend).
4. **Formulario de confirmación** (`/confirmar`, detrás de sesión cliente):
   - `GET /catalogo` y `GET /slots` con TanStack Query (ADR-016) — sin `useEffect`+`useState` manual.
   - Buscador que filtra el catálogo ya cargado en memoria (ADR-012) — sin llamadas al servidor por tecleo.
   - Dos cajas en vivo "Servicios seleccionados" / "Productos seleccionados" (ADR-004) con opción de quitar cada ítem, cada una mostrando su % de descuento en vivo. **El cálculo del preview usa `calcularDescuento` importado de `@event-promotion/shared-types` (ADR-025) — nunca una reimplementación a mano de las reglas.** Aclarar visualmente que es un preview, no el valor final (HU-3: el servidor recalcula, nunca confía en el cliente).
   - Selector de slot (los slots que devuelve `GET /slots`, sin cupos visibles todavía — eso es Gate 3).
   - Campo de nombre del cliente, editable (pre-llenado desde la sesión, `ConfirmarAsistenciaRequestSchema.nombreCliente` es opcional — ver `packages/shared-types/src/confirmaciones.ts`).
   - Submit → `POST /confirmaciones` con `react-hook-form` + `zodResolver(ConfirmarAsistenciaRequestSchema)` (ADR-016) — nunca validación manual donde el schema ya la expresa. Manejar 400 (ítem/slot no disponible), 401 (sesión expirada → redirigir a login), 409 (ya confirmado).
5. **Accesibilidad básica** en las 4 pantallas (labels asociados a inputs, foco visible, navegable por teclado) — no es la auditoría completa de Gate 6, solo lo básico que ya pide el CLAUDE.md para todo formulario.
6. **Probar en navegador de verdad**, no solo tests: levantar `docker compose up` (o `npm run dev` en `apps/web` + `apps/api` local) y ejercitar el flujo completo — invitar cliente → recibir el link (revisar consola/logs si no hay `RESEND_API_KEY` real todavía) → login → confirmar → ver el resultado. Usar el skill `run` o browser tools si están disponibles en la sesión.
7. Cierra el gate — **este es el checklist completo, no te lo saltees**:
   - Tests (unitarios de componentes si aplica; ADR-017 dice que no hay e2e de UI, así que no agregar Playwright/Cypress).
   - `/code-review` sobre **todo el diff de Gate 2** (sesiones A+B+C juntas, no solo esta sesión — es el primer review de gate completo).
   - `advisor`.
   - Walkthrough en `spec/todo.md` (fecha de hoy).
   - Actualiza `spec/ESTADO_PLAN.md`: G2 pasa a "cerrado", próximo paso = G3.
   - Cierra/comenta los issues de GitHub que correspondan (#7 HU-1 frontend, #9 HU-2 frontend, #11 HU-3 frontend).
   - Detente.

## Contexto que ya no hace falta redecidir (ya resuelto, no lo repitas ni lo cuestiones salvo que el código muestre lo contrario)

- Backend de Gate 2 completo: los 5 endpoints (`POST /admin/auth/login`, `POST /admin/invitaciones`, `POST /auth/login`, `GET /catalogo`, `GET /slots`, `POST /confirmaciones`) existen, están probados, y el contrato Zod completo ya está en `packages/shared-types` (`admin.ts`, `auth.ts`, `catalogo.ts`, `slots.ts`, `confirmaciones.ts`, `descuento.ts`, `discount-engine.ts`).
- CORS + cookies: la API ya tiene `cors` configurado con `credentials: true` y origin exacto (`FRONTEND_URL`) — el frontend debe mandar `credentials: "include"` en cada fetch para que la cookie de sesión viaje. `COOKIE_SECURE`/`SameSite` ya están resueltos correctamente para local y para Render (cross-site real, `onrender.com` está en la Public Suffix List) — no tocar esa lógica salvo que algo falle en la prueba real.
- El proveedor de deploy es Render, no Railway (ADR-014 revisada) — cualquier variable nueva se setea en el dashboard de Render, no en Railway.
- Los schemas Zod van en `packages/shared-types`, nunca duplicados a mano en `apps/web`/`apps/api` (ADR-003). Lo mismo aplica ahora al motor de descuento (ADR-025) — `apps/web` lo importa, no lo reimplementa.
- Las credenciales/secrets van siempre por variables de entorno — nunca hardcodeadas en código o config.
- El orden de build es `shared-types` → `apps/api` → `apps/web` — no lo cambies.
- `packages/shared-types/openapi.json` se commitea, y debe regenerarse (`npm run generate:openapi -w packages/shared-types`) si esta sesión agrega o cambia algún schema.
- HU-11 (reenviar código) está corregida por ADR-026 — no es parte de esta sesión (Gate 5), pero si tocás algo relacionado con invitaciones no reintroduzcas el criterio viejo ("reenvía el mismo código").
- El catálogo/slots sembrados son **datos placeholder** explícitos (`apps/api/src/db/seed.ts`) — pendiente reemplazar con el listado real del PDF cuando el usuario lo provea. No es bloqueante para esta sesión.

**No hagas commit.** El usuario comitea siempre — deja el árbol de trabajo listo y dilo explícitamente al terminar.
