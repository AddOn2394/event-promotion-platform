# Build context: raíz del monorepo (necesita packages/shared-types y el lockfile raíz).
# Render: ver render.yaml (dockerfilePath: ./apps/api/Dockerfile, dockerContext: .) —
# el build context tiene que seguir siendo la raíz del repo, no esta subcarpeta.

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci

COPY packages/shared-types packages/shared-types
COPY apps/api apps/api
RUN npm run build -w packages/shared-types
RUN npm run build -w apps/api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared-types ./packages/shared-types
COPY --from=builder /app/apps/api ./apps/api

WORKDIR /app/apps/api
EXPOSE 3000
# Render free tier no soporta preDeployCommand — migrate corre al arrancar el contenedor
# (es idempotente vía schema_migrations, seguro en cada restart/redeploy) porque sin las
# tablas la app no puede funcionar. seed NO va aquí a propósito: (a) requiere
# ADMIN_EMAIL/ADMIN_PASSWORD, que en Render son sync:false (el humano los define en el
# dashboard) — si faltan al primer boot, encadenarlo con && haría crashloopear el deploy;
# (b) plantar catálogo/slots placeholder en la DB de producción debe ser un paso explícito,
# no automático en cada boot. Correr `npm run db:seed -w apps/api` manualmente (Render
# Shell en producción, o `docker compose exec api ...` en local) una sola vez.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
