# Task Log — Activo

Trackea el trabajo sesión a sesión. Ver `spec/ESTADO_PLAN.md` para el estado consolidado de gates.

---

## 2026-09-16

- Entrevista spec-driven completa (7+ rondas): `spec/DECISIONES_ARQUITECTURA.md` (ADR-001 a ADR-024), `spec/SPEC_FUNCIONAL.md` (12 historias de usuario + modelo de datos + diagramas Mermaid), `spec/PLAN_DESARROLLO.md` (7 gates, G0-G6) — aprobados y commiteados por el usuario.
- Correcciones importantes durante la revisión: identidad de cliente pasó de "primera confirmación anónima" a "invitación previa obligatoria" (ADR-011); rate limiting corregido de email+IP a solo email (ADR-022); motor de descuento extendido con umbrales configurables + reglas como código open/closed (ADR-023); notificaciones con seguimiento de entrega vía webhook de Resend agregadas (ADR-024).
- 36 issues + 7 milestones creados en GitHub (`AddOn2394/event-promotion-platform`), repartidos `equipo-1-frontend`/`equipo-2-backend` por historia de usuario.
- Scaffold del monorepo completo: `apps/web` (Vite+React 19+TS), `apps/api` (Express+TS), `packages/shared-types`. Verificado: `npm install` limpio (302 paquetes), las 3 unidades compilan sin error, `apps/api` levanta y responde en `http://localhost:3000`.
- `.claude/CLAUDE.md` reescrito completo: convenciones React/Node/Express, referencia obligatoria a `spec/`, regla de que los commits los hace siempre el usuario.
- **Siguiente sesión**: Gate 0 — ver `spec/next-session-prompt.md`.
