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

---

## 2026-09-16 (Gate 0 — Contrato cerrado)

Se cerró Gate 0 siguiendo ADR-003 (corregida): los schemas Zod viven en `packages/shared-types`, no en `apps/api`. Se creó `ConfirmarAsistenciaItemSchema`/`ConfirmarAsistenciaRequestSchema`/`ConfirmarAsistenciaResponseSchema` (`packages/shared-types/src/confirmaciones.ts`) cubriendo el contrato de HU-3: request = `{ items: {catalogoItemId, categoria}[] (mínimo 1), slotId }`, response = subtotales/% descuento/total en centavos enteros, con los tipos `z.infer<...>` exportados. El generador de OpenAPI (`generate-openapi.ts`, `npm run generate:openapi -w packages/shared-types`) produce `openapi.json` válido con `$ref` a los 3 componentes nombrados y las respuestas 200/400/409 de `POST /confirmaciones` documentadas (400/409 solo como documentación por ahora — el endpoint real con esos status codes es Gate 2/Gate 3).

`apps/api` importa el schema y lo usa con `safeParse` en un `POST /confirmaciones` placeholder (400 si falla, 501 "no implementado" si pasa) — el endpoint real (motor de descuento, persistencia, cupo) es Gate 2. `apps/web` usa el mismo schema con `react-hook-form` + `@hookform/resolvers/zod` en un formulario placeholder con un campo de slot y un checkbox que simula un ítem seleccionado, solo para probar que la validación funciona en el navegador — el formulario real (catálogo, dos cajas en vivo, selector de slot) es Gate 2.

Durante el cierre, `/code-review` y el advisor encontraron y se corrigieron varios problemas reales, no cosméticos:
- **Resolución en runtime rota**: `package.json` de `shared-types` apuntaba `main`/`types` a `./src/index.ts`. `tsc` lo resolvía bien (lee `types` directo), pero `node dist/index.js` en producción habría fallado con `ERR_UNKNOWN_FILE_EXTENSION` al intentar importar un `.ts` — el problema era latente porque antes de este gate `apps/api` no importaba el paquete. Se agregó `exports`/`main`/`types` apuntando a `dist`, se corrigió el orden de build en el `package.json` raíz (`shared-types` antes que `apps/*`, antes se armaban en paralelo vía `-ws`), y se verificó levantando `node apps/api/dist/index.js` real y haciendo `POST` contra él (400/501/400 confirmados).
- **`npm run test` salía en rojo por "no test files"** en ambos workspaces — no cumplía "tests pasan" del gate. Se agregó un test de contrato en `apps/api` (`ConfirmarAsistenciaRequestSchema` rechaza selección vacía / slotId no-uuid, acepta un ítem — este es exactamente el criterio HU-3 marcado `(G0)` en el spec) y dos tests en `apps/web` que ejercitan la validación real vía `react-hook-form` (fireEvent + assert de errores visibles), no solo el renderizado.
- **`extendZodWithOpenApi(z)` + `.openapi()` en `confirmaciones.ts`** arrastraban `@asteasolutions/zod-to-openapi` al bundle de `apps/web` (ese archivo es importado por el cliente). Se movió toda la metadata de OpenAPI a `generate-openapi.ts` usando `registry.register()`, que no requiere anotar los schemas compartidos — el bundle de web bajó de 101 a 100 módulos transformados.
- `apps/api/tsconfig.json` excluye ahora `src/**/*.test.ts` del build (antes el `.test.js` se copiaba a `dist/`).
- Manejo de JSON malformado en `apps/api`: sin middleware de error, un body inválido devolvía la página HTML default de Express en vez de JSON — se agregó un handler mínimo que responde `400 {error: "JSON inválido"}`.

**Pendientes para el líder del proyecto (no se tocaron sin ratificación)**:
- `spec/PLAN_DESARROLLO.md` línea 15 (exit criterio de Gate 0) todavía dice que el schema vive "en `apps/api`" — quedó desactualizado desde la corrección de ADR-003. No se editó ese archivo.
- `packages/shared-types/openapi.json` quedó generado y **sin trackear** (no está en `.gitignore`, que solo ignora `dist/`). Falta decidir si se commitea (recomendado, para que el drift del contrato sea revisable en PRs) o se ignora y se regenera en CI.
- El `items` anidado dentro de `ConfirmarAsistenciaRequest` en el OpenAPI generado queda inline en vez de `$ref` a `ConfirmarAsistenciaItem` (sí existe como componente nombrado, solo no está referenciado desde ahí) — cosmético, no bloquea Gate 0, pero vale la pena revisarlo si en Gate 2 se generan schemas anidados más grandes.

Verificación final: `npm install` limpio, `npm run build` (orden `shared-types` → `apps/api` → `apps/web`) sin error, `npm run test` en verde con cobertura real (3 tests de contrato en `apps/api`, 2 tests de validación en `apps/web`), servidor compilado ejecutado y probado manualmente con `curl`.

**Siguiente paso**: Gate 1 — deploy pipeline verde (Dockerfiles + docker-compose + Railway, `GET /health` en la API).
