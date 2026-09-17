# Estado del Plan — Event Promotion Platform

> Última actualización: 2026-09-17 — **Gate 2 (Núcleo del PDF) cerrado completo** (sesiones A+B+C). Ver `spec/todo.md`.

---

## 1. Estado general

Entrevista spec-driven completada (7+ rondas, incluyendo correcciones del líder del proyecto sobre identidad de cliente, extensibilidad del descuento y trazabilidad de email). `spec/DECISIONES_ARQUITECTURA.md`, `spec/SPEC_FUNCIONAL.md` y `spec/PLAN_DESARROLLO.md` están aprobados y commiteados. GitHub Issues (36) + 7 milestones reflejan el reparto Equipo 1 (frontend) / Equipo 2 (backend) historia por historia. El scaffold del monorepo (`apps/web`, `apps/api`, `packages/shared-types`) está completo y `.claude/CLAUDE.md` fue reescrito para React/Node/Express.

**Gate 0 (contrato cerrado) completo.** `packages/shared-types` tiene el primer schema Zod end-to-end (`ConfirmarAsistenciaRequest`/`Response`, HU-3), el OpenAPI se genera de ahí, y `apps/api`/`apps/web` compilan y validan contra ese paquete (con tests reales, no solo compilación). Detalle completo del walkthrough en `spec/todo.md`, entrada "2026-09-16 (Gate 0 — Contrato cerrado)". Aún no hay lógica de negocio real (motor de descuento, endpoints reales, formulario real) — eso es Gate 2.

**Gate 1 (deploy pipeline verde) cerrado.** Dockerfiles (`apps/api`, `apps/web`), `docker-compose.yml`, `.dockerignore`, `GET /health`, credenciales de Postgres vía `.env`/`.env.example`, y `render.yaml` (Blueprint de Render, tras el cambio de proveedor — ADR-014 revisada, ver abajo). Verificado local (`docker compose up --build`) y en producción: `https://event-promotion-api.onrender.com/health` → `200 {"status":"ok"}`, `https://event-promotion-web.onrender.com/` → `200` con la página placeholder. `/code-review` sobre todo el gate sin hallazgos, `advisor` con pase de cierre. Detalle completo en `spec/todo.md`, entrada "2026-09-16 (Gate 1 — CERRADO)" (y las dos entradas previas del mismo día para el historial completo: verificación local y cambio de proveedor).

**Cambio de proveedor de deploy: Railway → Render (ADR-014 revisada, 2026-09-16).** El free tier real de Railway resultó ser ~$1/mes de crédito y bloquea deploys nuevos en horario pico salvo pagar plan Hobby; el usuario no quiso pagar. Se cambió a Render (free tier real, sin tarjeta) — detalle completo del trade-off aceptado en `spec/DECISIONES_ARQUITECTURA.md`. El proyecto de Railway (servicio `api` reconfigurado + servicio `web` vacío) quedó sin borrar — el usuario nunca confirmó si quería eliminarlo; no es el deploy activo, no asumir lo contrario en sesiones futuras.

**Pendiente de decisión del líder** (no resuelto sin ratificación, ver `spec/todo.md`): `spec/PLAN_DESARROLLO.md` línea 15 quedó desactualizada (dice que el schema vive "en `apps/api`", corregido por ADR-003 a `packages/shared-types`).

**Gate 2 (Núcleo del PDF) cerrado completo (sesiones A+B+C).** Sesión A: DB (migraciones + seed) y motor de descuento compartido (`calcularDescuento`, ADR-025). Sesión B: los 5 dominios de `apps/api` (`admin`, `auth`, `catalog`, `slots`, `registration`) con JWT en cookies httpOnly, envío de emails vía Resend, 24 tests de integración. Sesión C: las 4 pantallas de `apps/web` (login admin, invitar cliente, login cliente, confirmar con las dos cajas en vivo del preview de descuento), más un endpoint nuevo (`GET /configuracion-descuento`, ratificado con el usuario — necesario para que el preview de `apps/web` pueda llamar `calcularDescuento`). `/code-review` sobre el gate completo (A+B+C) encontró 10 hallazgos — 4 bugs de correctness/UX corregidos (deduplicación de ítems repetidos en `POST /confirmaciones`, `nombreCliente` vacío rompiendo el submit en 2 pantallas, redirección a login faltante en cookie expirada), 6 mejoras de simplificación/eficiencia diferidas a propósito con su razón documentada (ver `spec/todo.md`, entrada "2026-09-17 (Gate 2 — sesión C)"). Verificado en navegador real por el usuario (flujo completo: invitar → email real vía Resend → login → confirmar, con descuento y total verificados exactos en la DB). **Pendiente explícito**: los cambios de esta sesión no están desplegados en Render todavía en esta rama, y no se confirmaron las variables de entorno nuevas en el dashboard de Render — no asumir que producción refleja este estado hasta confirmar ambas cosas.

---

## 2. Gates — estado

| Gate | Estado | Issues GitHub |
|---|---|---|
| G0 — Contrato cerrado | **Cerrado** | milestone "G0 - Contrato cerrado" |
| G1 — Deploy pipeline verde | **Cerrado** | milestone "G1 - Deploy pipeline verde" |
| G2 — Núcleo del PDF | **Cerrado (sesiones A+B+C)** | milestone "G2 - Nucleo del PDF" |
| G3 — Cupo atómico por slot | No iniciado | milestone "G3 - Cupo atomico por slot" |
| G4 — Edición/deadline/cancelación | No iniciado | milestone "G4 - Edicion, deadline, cambio de slot y cancelacion" |
| G5 — Admin panel completo | No iniciado | milestone "G5 - Admin panel completo" |
| G6 — Endurecimiento final | No iniciado | milestone "G6 - Endurecimiento final" |

---

## 3. Decisiones cerradas (no reabrir sin nueva evidencia — ver ADR completo en `DECISIONES_ARQUITECTURA.md`)

- Stack: React + Node/Express + TypeScript, monorepo con npm workspaces (ADR-001, ADR-002, ADR-020).
- Contrato: schemas Zod en `packages/shared-types` como única fuente (ADR-003).
- Identidad de cliente: invitación previa por ventas + código de 6 dígitos, **nunca** confirmación anónima (ADR-011).
- Descuento: por categoría, tier más alto gana, centavos enteros, frontera Q1,500 estricta; umbrales configurables desde admin panel, escenarios nuevos como código (patrón strategy, open/closed) (ADR-004, ADR-005, ADR-023).
- Evento: un evento activo, múltiples slots administrados, cupo atómico vía `UPDATE ... WHERE > 0`, orden de lock determinista en cambio de slot (ADR-008, ADR-009).
- Notificaciones: log + webhook de Resend para detectar rebotes proactivamente (ADR-024).
- Infraestructura: Render (deploy) + Resend (email) (ADR-014/015, revisada 2026-09-16 — antes Railway). BD: PostgreSQL (ADR-021).
- Rate limiting: por email, nunca por IP (ADR-022, corregido tras observación del usuario).
- GitHub Issues + milestones (no Projects board) para el reparto de tareas Equipo 1/Equipo 2.
- **Los commits los hace siempre el líder del proyecto — nunca el asistente.**
- Motor de descuento compartido en `packages/shared-types` (ADR-025) — extiende ADR-003 a funciones puras de negocio sin I/O que ambas apps necesitan idénticas.
- HU-11 (reenviar código) corregida: genera código nuevo, no recupera el original (ADR-026) — incompatible con nunca guardar el código en texto plano.

---

## 4. Pendientes antes de tocar código de features

Ninguno. Los 3 gates abiertos originales de la v1.0 y las 3 dudas planteadas por el usuario durante la revisión final (extensibilidad del descuento, notificaciones, granularidad de issues) ya quedaron resueltas y documentadas.

---

## 5. Próximo paso

**Gate 2 cerrado completo.** Próximo: **Gate 3 — cupo atómico por slot** (ver `spec/PLAN_DESARROLLO.md`). Antes de tocar código de Gate 3: confirmar en el dashboard de Render que las variables nuevas de Gate 2 (`JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FRONTEND_URL`, `COOKIE_SECURE`) están seteadas y desplegar la rama actual (incluye `GET /configuracion-descuento`, no desplegado todavía) antes de dar por buena cualquier verificación en producción.
