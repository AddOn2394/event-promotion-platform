# Estado del Plan — Event Promotion Platform

> Última actualización: 2026-09-16 — spec funcional completo (ADR-001 a ADR-024), plan de gates (G0-G6), 36 issues de GitHub creados en 7 milestones (`equipo-1-frontend` / `equipo-2-backend`). Scaffold del monorepo listo y verificado (instala, compila, `apps/api` levanta y responde). **Ningún gate de código iniciado todavía.**

---

## 1. Estado general

Entrevista spec-driven completada (7+ rondas, incluyendo correcciones del líder del proyecto sobre identidad de cliente, extensibilidad del descuento y trazabilidad de email). `spec/DECISIONES_ARQUITECTURA.md`, `spec/SPEC_FUNCIONAL.md` y `spec/PLAN_DESARROLLO.md` están aprobados y commiteados. GitHub Issues (36) + 7 milestones reflejan el reparto Equipo 1 (frontend) / Equipo 2 (backend) historia por historia. El scaffold del monorepo (`apps/web`, `apps/api`, `packages/shared-types`) está completo y `.claude/CLAUDE.md` fue reescrito para React/Node/Express.

**No se ha escrito código de features todavía.**

---

## 2. Gates — estado

| Gate | Estado | Issues GitHub |
|---|---|---|
| G0 — Contrato cerrado | **No iniciado — próximo paso** | milestone "G0 - Contrato cerrado" |
| G1 — Deploy pipeline verde | No iniciado | milestone "G1 - Deploy pipeline verde" |
| G2 — Núcleo del PDF | No iniciado | milestone "G2 - Nucleo del PDF" |
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
- Infraestructura: Railway (deploy) + Resend (email) (ADR-014/015). BD: PostgreSQL (ADR-021).
- Rate limiting: por email, nunca por IP (ADR-022, corregido tras observación del usuario).
- GitHub Issues + milestones (no Projects board) para el reparto de tareas Equipo 1/Equipo 2.
- **Los commits los hace siempre el líder del proyecto — nunca el asistente.**

---

## 4. Pendientes antes de tocar código de features

Ninguno. Los 3 gates abiertos originales de la v1.0 y las 3 dudas planteadas por el usuario durante la revisión final (extensibilidad del descuento, notificaciones, granularidad de issues) ya quedaron resueltas y documentadas.

---

## 5. Próximo paso

Iniciar **Gate 0**. Ver `spec/next-session-prompt.md` para el prompt exacto de arranque.
