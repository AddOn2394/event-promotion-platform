# Prompt — Próxima sesión: terminar Gate 1 (en Render)

Continuamos `event-promotion-platform`. Gate 1 (deploy pipeline) está **en progreso, no cerrado** — ver `spec/todo.md`, entradas "2026-09-16 (Gate 1 — Deploy pipeline, EN PROGRESO, no cerrado)" y "2026-09-16 (Gate 1 — cambio de proveedor: Railway → Render, ADR-014 revisada)" antes de tocar nada.

**El proveedor de deploy cambió de Railway a Render durante la sesión anterior** (ADR-014 revisada en `spec/DECISIONES_ARQUITECTURA.md`) — Railway resultó no tener free tier real sin pagar. No vuelvas a proponer Railway salvo que el usuario lo pida explícitamente.

Ya existen y no hace falta rehacer: `apps/api/Dockerfile`, `apps/web/Dockerfile` (ya verificados corriendo local con `docker compose up --build` — el usuario confirmó `http://localhost:3000/health` y `http://localhost:4173` respondiendo), `docker-compose.yml`, `.dockerignore`, `.env.example`, `GET /health` en `apps/api`, `render.yaml` (Blueprint de Render con los 3 servicios: `event-promotion-api`, `event-promotion-web`, `event-promotion-db`).

Ejecuta en este orden. No pidas confirmación entre pasos salvo que algo sea ambiguo o contradiga lo que encuentres en el código.

1. Confirmar si el usuario ya tiene cuenta de Render. Si no, que la cree en render.com (sin tarjeta de crédito requerida para el free tier).
2. Guiar al usuario: en el dashboard de Render, "New +" → "Blueprint" → conectar el repo `AddOn2394/event-promotion-platform` → Render debería detectar `render.yaml` automáticamente y proponer crear los 3 recursos (2 Web Services + 1 Postgres). El usuario aplica el Blueprint.
3. Verificar el estado de los 3 deploys. Si Render tiene MCP/CLI disponible en esta sesión, usarlo para diagnosticar en vez de pedirle al usuario que copie logs a mano (como se hizo con Railway vía su MCP oficial — mismo enfoque, otro proveedor). Si no hay tooling de Render disponible, pedir al usuario los logs de build/deploy del dashboard.
4. Una vez desplegado, confirmar que las URLs públicas responden: `GET /health` de la API (200, `{"status":"ok"}`) y la página de `apps/web`. Nota: los Web Services free de Render duermen tras 15 min de inactividad — el primer request tras dormir puede tardar 30-60s (cold start), no es un error.
5. Cierra el gate: corre los tests que existan (ya están en verde, solo re-confirmar) → pide `/code-review` sobre cualquier cambio nuevo que haya surgido de la verificación → llama al `advisor` → escribe un párrafo de walkthrough en `spec/todo.md` (fecha de hoy) → actualiza `spec/ESTADO_PLAN.md` (G1 pasa a "cerrado", próximo paso = G2) → detente.

No implementes lógica de negocio real (invitaciones, login, formulario, motor de descuento) en este gate — eso es Gate 2 (issues en GitHub, milestone "G2 - Nucleo del PDF"). Este gate es exclusivamente el pipeline de despliegue.

**Contexto que ya no hace falta redecidir** (no lo repitas ni lo cuestiones salvo que el código muestre lo contrario):
- Render es el proveedor de deploy (ADR-014 revisada) — no Railway. El usuario dejó un proyecto configurado en Railway (servicio `api` reconfigurado con Dockerfile correcto, servicio `web` creado sin source) que no se borró todavía; no hace falta tocarlo salvo que el usuario lo pida.
- Las credenciales de Postgres van siempre por `.env`/`.env.example` en local, nunca hardcodeadas — instrucción explícita del usuario, aplica a cualquier archivo de código/config que toques de acá en adelante. En Render, la conexión a la DB se resuelve vía `fromDatabase` en `render.yaml`, no hace falta ningún `.env` ahí.
- El orden de build en la raíz ya es `shared-types` → `apps/api` → `apps/web` (`package.json`), porque `apps/api`/`apps/web` dependen del `dist/` compilado de `shared-types`, no de su fuente. Ambos Dockerfiles ya respetan ese orden.
- `packages/shared-types/openapi.json` se commitea (decisión ya tomada por el líder del proyecto) — no lo agregues a `.gitignore`.

**No hagas commit.** El usuario comitea siempre — deja el árbol de trabajo listo y dilo explícitamente al terminar.
