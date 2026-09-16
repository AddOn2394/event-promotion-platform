# Prompt — Próxima sesión: terminar Gate 1

Continuamos `event-promotion-platform`. Gate 1 (deploy pipeline) está **en progreso, no cerrado** — ver `spec/todo.md`, entrada "2026-09-16 (Gate 1 — Deploy pipeline, EN PROGRESO, no cerrado)" antes de tocar nada.

Ya existen, ya pasaron `/code-review` + advisor, y **ya se verificaron corriendo localmente con `docker compose up --build`** (el usuario confirmó `http://localhost:3000/health` y `http://localhost:4173` respondiendo): `apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.example`, `GET /health` en `apps/api`, `preview.allowedHosts` en `apps/web/vite.config.ts`. No los reescribas desde cero ni vuelvas a pedir la verificación local — lo único que falta es Railway.

Ejecuta en este orden. No pidas confirmación entre pasos salvo que algo sea ambiguo o contradiga lo que encuentres en el código.

1. Confirmar el estado de Railway: el usuario ya tiene el proyecto creado. Falta crear los servicios `api` y `web` (apuntando al mismo repo, con `RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile` / `apps/web/Dockerfile` — **sin** fijar "Root Directory", el contexto de build tiene que seguir siendo la raíz del monorepo) y el addon de Postgres administrado. Esto lo hace el usuario desde el dashboard (puede ser desde el celular); vos guialo paso a paso y esperá confirmación de cada uno antes de asumir que está hecho.
2. Una vez desplegado, confirmar que las URLs públicas responden: `GET /health` de la API (200, `{"status":"ok"}`) y la página de `apps/web`.
3. Cierra el gate: corre los tests que existan (ya están en verde, solo re-confirmar) → pide `/code-review` sobre cualquier cambio nuevo que haya surgido de la verificación → llama al `advisor` → escribe un párrafo de walkthrough en `spec/todo.md` (fecha de hoy) → actualiza `spec/ESTADO_PLAN.md` (G1 pasa a "cerrado", próximo paso = G2) → detente.

No implementes lógica de negocio real (invitaciones, login, formulario, motor de descuento) en este gate — eso es Gate 2 (issues en GitHub, milestone "G2 - Nucleo del PDF"). Este gate es exclusivamente el pipeline de despliegue.

**Contexto que ya no hace falta redecidir** (no lo repitas ni lo cuestiones salvo que el código muestre lo contrario):
- ADR-014 (Railway) sigue en pie — el usuario resolvió el bloqueo de plan Trial/Hobby por su cuenta durante la sesión anterior, no hace falta reabrir esa decisión.
- Las credenciales de Postgres van siempre por `.env`/`.env.example`, nunca hardcodeadas — instrucción explícita del usuario, aplica a cualquier archivo de código/config que toques de acá en adelante, no solo a este gate.
- El orden de build en la raíz ya es `shared-types` → `apps/api` → `apps/web` (`package.json`), porque `apps/api`/`apps/web` dependen del `dist/` compilado de `shared-types`, no de su fuente. Ambos Dockerfiles ya respetan ese orden.
- `packages/shared-types/openapi.json` se commitea (decisión ya tomada por el líder del proyecto) — no lo agregues a `.gitignore`.

**No hagas commit.** El usuario comitea siempre — deja el árbol de trabajo listo y dilo explícitamente al terminar.
