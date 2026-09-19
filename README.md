# Event Promotion Platform

Plataforma de confirmación de asistencia para el evento anual de promociones. Ver `spec/` para el diseño completo:

- [`spec/DECISIONES_ARQUITECTURA.md`](spec/DECISIONES_ARQUITECTURA.md) — decisiones de arquitectura (ADRs)
- [`spec/SPEC_FUNCIONAL.md`](spec/SPEC_FUNCIONAL.md) — roles, historias de usuario, modelo de datos, diagramas
- [`spec/PLAN_DESARROLLO.md`](spec/PLAN_DESARROLLO.md) — gates de desarrollo y sus criterios de cierre
- [`spec/ESTADO_PLAN.md`](spec/ESTADO_PLAN.md) — estado actual consolidado de cada gate
- [`spec/todo.md`](spec/todo.md) — log de trabajo sesión a sesión
- [`spec/next-session-prompt.md`](spec/next-session-prompt.md) — prompt listo para arrancar la próxima sesión

## Estructura del monorepo

```
apps/
  web/              React + Vite + TypeScript
  api/              Node.js + Express + TypeScript
packages/
  shared-types/     Schemas Zod compartidos (fuente del contrato, ver ADR-003)
```

## Desarrollo local

Requisitos: Node.js 20+, Docker (para Postgres local).

1. **Variables de entorno**: copiar `.env.example` → `.env` (raíz, gitignorado) y `apps/web/.env.example` → `apps/web/.env`. Completar `.env` con valores propios:
   - `JWT_SECRET`: un string largo y aleatorio (ej. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
   - `ADMIN_EMAIL`/`ADMIN_PASSWORD`: credenciales de la cuenta admin seed (ADR-013).
   - `RESEND_API_KEY`/`RESEND_FROM_EMAIL`: no hacen falta valores reales para desarrollar — sin una key válida, el envío de email simplemente falla de forma controlada (`enviarEmail` devuelve `{ exito: false }`, ADR-024) y el flujo sigue funcionando; solo no vas a recibir el correo con el código de invitación.
   - `RESEND_WEBHOOK_SECRET`: en local puede ser cualquier string con el formato `whsec_<base64>` (ej. `node -e "console.log('whsec_' + require('crypto').randomBytes(32).toString('base64'))"`) — la firma se verifica igual, solo que contra un secreto que nadie más conoce.
   - `FRONTEND_URL=http://localhost:5173`, `COOKIE_SECURE=false` para desarrollo.

2. **Base de datos** (Postgres vía Docker):
   ```bash
   docker compose up -d postgres
   ```

3. **Instalar dependencias y migrar/sembrar** (las variables del `.env` deben estar exportadas en la shell; `DATABASE_URL` no viene en `.env.example` porque `docker-compose.yml` la arma para los contenedores — en local hay que construirla vos apuntando a `localhost`):
   ```bash
   npm install
   export DATABASE_URL="postgres://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5432/<POSTGRES_DB>"
   npm run build -w packages/shared-types   # necesario antes del primer dev:api (dist/ no existe todavía)
   npm run db:migrate -w apps/api
   npm run db:seed -w apps/api
   ```

4. **Levantar los servidores de desarrollo** (dos terminales):
   ```bash
   npm run dev:api    # http://localhost:3000 — usa la misma DATABASE_URL exportada arriba
   npm run dev:web    # http://localhost:5173
   ```
   Verificar que la API responde: `curl http://localhost:3000/health` → `{"status":"ok"}`.

## Build

```bash
npm run build
```

## Tests

Los tests de integración de `apps/api` corren contra una base de datos Postgres real (ADR-017) — nunca la de desarrollo, porque las fixtures hacen `TRUNCATE`/`DELETE` entre tests:

```bash
export DATABASE_URL="postgres://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5432/event_promotion_test"
npm run test:db:setup -w apps/api   # crea la DB de test si no existe
npm run db:migrate -w apps/api      # migra la DB de test (misma DATABASE_URL de arriba)
npm run test                        # corre los 3 workspaces (apps/api, apps/web, packages/shared-types)
```

`FRONTEND_URL`, `JWT_SECRET` y `RESEND_WEBHOOK_SECRET` (además de `DATABASE_URL`) deben estar exportados para que los tests de integración de `apps/api` arranquen.

## Demo pública

Todavía no hay ninguna rama posterior a Gate 1 desplegada en Render — el deploy activo (`https://event-promotion-api.onrender.com`, `https://event-promotion-web.onrender.com`) solo sirve el placeholder de Gate 1. No hay link de demo funcional con las features de Gate 2 en adelante hasta que se despliegue y se verifique explícitamente.
