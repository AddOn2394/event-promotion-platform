# Prompt — Próxima sesión: Gate 2

Continuamos `event-promotion-platform`. Gate 1 (deploy pipeline verde) está **cerrado** — ver `spec/todo.md`, entrada "2026-09-16 (Gate 1 — CERRADO)" para el walkthrough completo antes de tocar código nuevo. La app está desplegada en Render: `https://event-promotion-api.onrender.com` y `https://event-promotion-web.onrender.com` (ambos free tier — el servicio web duerme tras 15 min de inactividad, cold start ~30-60s en el primer request).

Lee antes de escribir código: `spec/ESTADO_PLAN.md`, `spec/PLAN_DESARROLLO.md` Gate 2 (líneas 23-38), `spec/DECISIONES_ARQUITECTURA.md` — en particular ADR-004/ADR-005/ADR-023 (motor de descuento), ADR-008 (slots), ADR-011 (invitación + login por código), ADR-013 (login admin), ADR-015 (Resend), ADR-016 (React Hook Form + Zod + TanStack Query), ADR-024 (notificaciones). `spec/SPEC_FUNCIONAL.md` para las historias de usuario y el modelo de datos completo.

Gate 2 es el gate más grande del plan — considerá partirlo en sesiones si no entra en una sola. Ejecuta en este orden. No pidas confirmación entre pasos salvo que algo del spec sea ambiguo o contradiga lo que encuentres en el código — en ese caso, detente y pregunta, no asumas.

1. **Modelo de datos**: catálogo de servicios/productos seedeado (fijo, sin CRUD — eso es Gate 5). Tabla `slots` (ADR-008) seedeada, **sin** `cupos_disponibles` todavía (eso es Gate 3 exclusivo, para no construir el formulario dos veces). Tabla `invitaciones` (ADR-011). Tabla `configuracion_descuento` (ADR-023) seedeada con los valores del PDF (2 servicios/3%, 2 servicios+Q1,500/5%, 3 productos/3%, 5 productos/5%). Tabla `notificaciones` (ADR-024, `idconfirmacion` nullable).
2. **Motor de descuento**: función pura, testeable sin DB, implementada como lista de reglas (predicado + %, ADR-023) — open/closed desde el día uno. Money siempre en centavos enteros, nunca float. Frontera Q1,500 estricta. Tests unitarios exhaustivos de la tabla de fronteras de ADR-005 (2 servicios en Q1,500.00 exacto → 3%, Q1,500.01 → 5%, análogo productos en 3/4/5) — esto es exit criterio explícito del gate, no opcional.
3. **Admin (dos pantallas mínimas, no un endpoint sin UI)**: login admin (cuenta seed, ADR-013) y pantalla "Invitar cliente" (email/nombre → código de 6 dígitos, hasheado, enviado por email vía Resend). El resto del admin panel es Gate 5.
4. **Login de cliente** por email + código (JWT en cookie httpOnly) — puerta de entrada obligatoria al formulario, sin excepción ni siquiera la primera vez.
5. **Formulario** (detrás del login): datos del cliente + selección de servicios/productos con las dos cajas en vivo (ADR-004) + selector de slot. `react-hook-form` + el schema Zod compartido (ADR-016) — nunca validación hecha a mano donde el schema ya la expresa.
6. **Confirmar** persiste con snapshot de precio/descuento y snapshot de los umbrales usados (ADR-006, ADR-023), referenciando slot e invitación desde el día uno.
7. Cierra el gate: tests (incluida la tabla de fronteras completa) → `/code-review` sobre el diff → `advisor` → walkthrough en `spec/todo.md` (fecha de hoy) → actualiza `spec/ESTADO_PLAN.md` (G2 pasa a "cerrado", próximo paso = G3) → detente.

**Contexto que ya no hace falta redecidir** (ya resuelto, no lo repitas ni lo cuestiones salvo que el código muestre lo contrario):
- El proveedor de deploy es **Render**, no Railway (ADR-014 revisada en Gate 1) — la app ya está viva ahí, cualquier variable/config nueva que agregues (ej. `RESEND_API_KEY`) se setea en el dashboard de Render, no en Railway. El proyecto de Railway sigue existiendo sin borrar (servicio `api` reconfigurado + servicio `web` vacío) pero no es el deploy activo — ignoralo salvo que el usuario pida limpiarlo.
- Los schemas Zod van en `packages/shared-types`, nunca duplicados a mano en `apps/web`/`apps/api` (ADR-003).
- Las credenciales/secrets (incluido `RESEND_API_KEY`) van siempre por variables de entorno — en Render vía el dashboard/`render.yaml`, en local vía `.env`/`.env.example`, nunca hardcodeadas en código o config. Instrucción explícita del usuario, aplica a todo archivo que toques.
- El orden de build es `shared-types` → `apps/api` → `apps/web` — ya reflejado en `package.json` raíz y en ambos Dockerfiles, no lo cambies.
- `packages/shared-types/openapi.json` se commitea.

**No hagas commit.** El usuario comitea siempre — deja el árbol de trabajo listo y dilo explícitamente al terminar.
