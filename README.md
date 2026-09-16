# Event Promotion Platform

Plataforma de confirmación de asistencia para el evento anual de promociones. Ver `spec/` para el diseño completo:

- [`spec/DECISIONES_ARQUITECTURA.md`](spec/DECISIONES_ARQUITECTURA.md) — decisiones de arquitectura (ADRs)
- [`spec/SPEC_FUNCIONAL.md`](spec/SPEC_FUNCIONAL.md) — roles, historias de usuario, modelo de datos, diagramas
- [`spec/PLAN_DESARROLLO.md`](spec/PLAN_DESARROLLO.md) — gates de desarrollo y su estado

## Estructura del monorepo

```
apps/
  web/              React + Vite + TypeScript
  api/              Node.js + Express + TypeScript
packages/
  shared-types/     Schemas Zod compartidos (fuente del contrato, ver ADR-003)
```

## Desarrollo local

```bash
npm install
npm run dev:web    # http://localhost:5173
npm run dev:api    # http://localhost:3000
```

## Build

```bash
npm run build
```

## Tests

```bash
npm run test
```
