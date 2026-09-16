# Build context: raíz del monorepo (necesita packages/shared-types y el lockfile raíz).
# Railway: setear RAILWAY_DOCKERFILE_PATH=apps/web/Dockerfile y NO fijar Root Directory,
# para que el build context siga siendo la raíz del repo.

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY packages/shared-types packages/shared-types
COPY apps/web apps/web
RUN npm run build -w packages/shared-types
RUN npm run build -w apps/web

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared-types ./packages/shared-types
COPY --from=builder /app/apps/web ./apps/web

WORKDIR /app/apps/web
EXPOSE 4173
CMD ["sh", "-c", "npm run preview -- --host 0.0.0.0 --port ${PORT:-4173}"]
