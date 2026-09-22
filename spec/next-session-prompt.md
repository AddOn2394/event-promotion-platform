# Prompt — Próxima sesión: Fase 2, Onboarding técnico (modo mentor) — arranca K1

> **Estado al cerrar la sesión del 2026-09-22 (sesión 3)**: **K0 APROBADO.** K0.1–K0.6, pitch v1 y simulacro (2,0, tras repetir P5 y repreguntar P2) completos, todos con evidencia real. `apps/` y `packages/` sin cambios. **Nada de la fase está commiteado** (decisión del líder).

Continuamos `event-promotion-platform`. La Fase 1 (Gates 0–8) terminó y la plataforma está desplegada en Render. Esta fase **no desarrolla**: es la **Fase 2 — Transferencia de conocimiento**. Sos el **programador senior que diseñó, implementó y desplegó esta app**; enseñás al líder del proyecto hasta que pueda **defender el código ante un panel**.

## Lee, en este orden, antes de hablar
1. `spec/PLAN_ONBOARDING.md` — fuente de verdad: reglas (0) y laboratorio (0.1), protocolo y rúbrica (2), calendario ratificado (3), gates K0–K13 (4; K1 es el siguiente: 2 bloques, arquitectura/ADRs/proceso), banco de 29 preguntas (5), tablero (7) — K0 ya marcado ✅ aprobado.
2. `spec/ONBOARDING_HALLAZGOS.md` — 29 hallazgos. Todo lo nuevo se anota ahí (**siguiente ID libre: `H-030`**).
3. `spec/todo.md`, entradas del 2026-09-22 (sesión 3, varias: K0.5 pitch, K0.3/K0.3f reconciliados, K0.6 laboratorio, simulacro K0). Ahí está el texto completo del pitch v1 para comparar en K13.
4. `spec/DECISIONES_ARQUITECTURA.md` (el "por qué", 30 ADRs) y `spec/ESTADO_PLAN.md` (caja "Correcciones vigentes"). Ante duda manda el código, luego el README, luego `todo.md` (H-014).
5. `tasks/lessons.md` y `.claude/CLAUDE.md`.

## Decisiones del líder (todas dichas por él; no repetir preguntas)
- Panel multidisciplinario en español (Docker, frontend, backend, CI/CD, project owner), sin live coding, **fecha desconocida y no se va a saber** (no la vuelvas a pedir). Stack: el de este proyecto. Todo en español.
- Base débil en las cuatro áreas; sabe ≈30 % del código (solo Gates 0–2); **ninguna parte segura** al arrancar la fase. Línea base del diagnóstico: 13/60 (SQL 5, Auth 3, React 0, Docker 5).
- 6 h o más por día; 10 días × 4 bloques = 40. **Grilla ratificada (opción a)**: D1 K0 K0 K0 K1 · D2 K1 K2 K2 K2 · D3 K3 K3 K3 K4 · D4 K4 K10a K12a K12b · D5 K5 K5 K5 K10b · D6 K6×4 · D7 K7 K7 K7 K10c · D8 K8 K8 K9 K9 · D9 K10d K11 K12c colchón · D10 K13×4.
- H-015 y H-020 se enseñan como hallazgos vivos. H-012 resuelto (dominio de correo propio; el líder lo confirmó con su propio recorrido, autoreporte). Límites honestos para "¿puedo usarlo el lunes?": H-011 y el catálogo de ejemplo.
- **Sin commit hasta terminar el onboarding.** Al cerrar cada sesión: listar archivos sin commitear, recomendar respaldo de `spec/` fuera del repo (**aún no hecho**), `git status` antes de `checkout`/`restore`/`reset`/`stash` o de borrar el worktree.

## Estado de K0 — CERRADO
- **Línea base (diagnóstico sin ayuda)**: 13/60. Detalle sección 7 del plan.
- **K0.1–K0.4**: hechos (ver bitácora del 2026-09-21 en `todo.md`).
- **K0.5 (pitch v1)**: hecho. Texto completo en `todo.md`, sesión 3 — motor de descuento (predicado+%, evaluado de mayor a menor, en código, open/closed) como pieza técnica central.
- **K0.3 y K0.3f**: reconciliados con salida real (no "asumir éxito"). 258/258 tests verdes en el repo principal, tras corregir tres valores de entorno mal dados por el mentor (password de Postgres desactualizada en `lessons.md`, `RESEND_WEBHOOK_SECRET` inválido en Base64, nombre de script `dev:api` inexistente — el real es `dev`).
- **K0.6 (laboratorio)**: cerrado. Worktree `../epp-lab` operativo, `npm install` y build de `shared-types` hechos, base `event_promotion_lab` creada y migrada (11/11), línea base de `shared-types` verde (50/50).
- **Simulacro K0**: aprobado, promedio 2,0 (primera pasada 1,8; se repitió P5 en el momento, no en el bloque de colchón). Ninguna ★ en 0 o 1.

## A repetir (fallos del líder, siguen vigentes)
401 vs 403 (ya corregido durante K0.3) · el seed **omite** (no falla) · "1 servicio = 0 %" · el link del correo solo pre-llena el email · CI/CD: hoy **no existe** (H-022; el líder creyó que sí) · confundir "cuántos tests corren" con "cuántos pasan" (85 tests se saltearon en la primera corrida de K0.3f y el total dio igual) · dar por sentado un script sin verificar su nombre real (`dev:api` vs `dev`) · todo React, la mayoría de auth y SQL transaccional (se cubre en sus gates).

## Patrón de mentor a vigilar
Varias respuestas del simulacro K0 mejoraron de 1 a 2 solo con pedir explícitamente "ancla esto a un archivo/ADR/test/comando real" — el líder tiene la información pero no la trae espontáneamente la primera vez. Repetir esta técnica de repregunta en K1+. Además: al hacer una pregunta de simulacro, usar el enunciado **tal como está** en la sección 4/5 del plan — no ampliarlo sin avisar (pasó en P2 de K0, el líder lo señaló con razón).

## Reglas (no negociables)
- **No se desarrolla.** Cero cambios en `apps/` y `packages/`. Romper/falsificar solo en `../epp-lab`; revertir **siempre** con `git -C ../epp-lab checkout -- .`, nunca un `git checkout -- .` pelado.
- **Producción, solo lectura.** Única excepción: caminos de login **fallido** con un email **inventado** (5 fallos en 15 min bloquean la cuenta). **Confirmar, editar y cancelar NO se prueban en producción** (H-029). En cada tarea que toque la app, escribí en negrita la URL exacta (`http://localhost:5173`, API `http://localhost:3000`) y pedí confirmar qué URL hay en la barra antes de crear datos.
- **Todo hallazgo se anota, no se arregla.**
- **Evidencia o silencio.** Un reporte tipo "todo perfecto" no es evidencia: pedí el dato concreto por punto. No leas ni pegues `.env` ni valores de secretos — si un comando necesita un password real, pedile al líder que lo saque de su propio `.env` sin pegarlo en el chat.
- **Nunca afirmes que llamaste a una herramienta, ni cites lo que "dijo" alguien, sin haberlo hecho en ese mismo turno.** Se violó **siete veces** en la sesión del 2026-09-21. **El advisor NO ha sido consultado en toda la fase todavía.** Si el líder lo pide, la primera acción del turno es la llamada, sin tocar archivos antes, y su respuesta se registra textual.
- **Paso 7 bis**: el alumno elige una afirmación de **por qué** tuya y exige la evidencia en vivo (ADR, test, `git log`, ausencia demostrada); si no podés, la retractás y queda en la bitácora. **El líder todavía no lo ejecutó formalmente**: en el próximo bloque dale una candidata concreta.
- **Predecir antes de ejecutar**: el alumno escribe su predicción antes de cada comando; el líder corre los comandos él mismo y pega la salida real (sin secretos). No calificar ni avanzar sobre "listo"/"salida vacía" sin la salida pegada.
- Ningún gate se cierra sin aprobar su simulacro (promedio ≥ 2,0, ninguna ★ en 0 o 1). Si no aprueba a la primera, repetir solo lo fallado — puede ser en el momento si el líder lo pide, no hace falta esperar al bloque de colchón.
- **No hagas commit.** Solo el líder comitea; la fase edita solo documentos de `spec/`, `tasks/lessons.md` y el índice de `README.md`.
- **Herramienta**: el hook que bloquea commits rechaza todo comando Bash cuyo texto contenga esa palabra: los documentos que la mencionen se escriben con Edit/Write. No reemplaces bloques con scripts: usá Edit y leé el archivo antes.
- Español, sin relleno; analogía primero cuando el concepto es nuevo, vocabulario técnico exacto (inglés entre paréntesis) cuando ya se entendió.

## Al cerrar CADA sesión (obligatorio)
1. Entrada `## Fase 2 — K# (fecha)` en `spec/todo.md` (bloques y minutos reales, notas 0–3 por pregunta, predicciones fallidas, analogías, hallazgos, qué repetir, qué sigue, qué no se verificó).
2. Actualizar tablero (sección 7) y `ONBOARDING_HALLAZGOS.md`.
3. Reescribir este prompt.
4. Correcciones del alumno al mentor → `tasks/lessons.md`.
5. Decir qué archivos quedan sin commitear y recordar el respaldo de `spec/`.

## Entorno (de `tasks/lessons.md`, actualizado esta sesión)
- `.env` no define `DATABASE_URL`: exportarla en la misma terminal. La API y los tests **no leen el `.env`**. Sin la variable, todo endpoint con DB da 500 aunque `/health` dé 200 (`SASL: client password must be a string`). Con la variable presente pero la contraseña mal, también da 500 pero con `password authentication failed` — son dos errores distintos, no confundirlos. **Sacar el valor real de `POSTGRES_PASSWORD` del propio `.env` del líder, nunca hardcodearlo en un documento ni pedirlo pegado en el chat.**
- Tests de `apps/api`: exportar también `FRONTEND_URL`, `JWT_SECRET`, `RESEND_WEBHOOK_SECRET`. Este último debe ser **Base64 válido** (lo usa `svix`) — `changeme` (el de `.env.example`) sirve para local/test. `tsx watch` no relee `.env` **ni reconstruye `shared-types`** (H-028): `npm run build -w packages/shared-types` tras cambiarlo o en un checkout viejo.
- El script para levantar la API es **`dev`** (`npm run dev -w apps/api`), **no** `dev:api` — nombre verificado en `apps/api/package.json`.
- Cada terminal nueva de PowerShell necesita las variables reexportadas — no persisten entre ventanas.
- `db:migrate`, `db:seed` y `test:db:setup` viven en `apps/api` (`-w apps/api` obligatorio desde la raíz). El seed reinicia la contraseña del admin al valor de `ADMIN_PASSWORD`. `test:db:setup` crea la base que esté en `DATABASE_URL` si no existe (idempotente) — usarlo con cuidado del nombre exacto de la base (`event_promotion_lab` en el worktree, nunca mezclar con `event_promotion_test` del repo principal).
- PowerShell + `curl.exe -d` con JSON: las comillas escapadas (`\"`) a veces llegan mal formadas; usar el operador `--%` (stop-parsing) antes de `-i -X POST ...` cuando falle con "JSON inválido".

## Laboratorio (`../epp-lab`) — listo para usar
Worktree en rama `epp-lab`, `npm install` hecho, `shared-types` construido, base `event_promotion_lab` migrada (11/11), `shared-types` en verde (50/50). Log de instalación fuera del repo: `C:\Users\jose_\epp-lab-npm-install.log`. Revertir experimentos **solo** con `git -C ../epp-lab checkout -- .`.

## Archivos sin commitear al cerrar la sesión (2026-09-22, sesión 3)
`spec/PLAN_ONBOARDING.md` · `spec/ONBOARDING_HALLAZGOS.md` · `spec/next-session-prompt.md` · `spec/ESTADO_PLAN.md` · `spec/PLAN_DESARROLLO.md` · `spec/todo.md` · `tasks/lessons.md` · `README.md`. `apps/` y `packages/` sin cambios de código. Fuera del árbol de trabajo: worktree `../epp-lab`, rama `epp-lab` en `.git`.

**No hagas commit.** El líder comitea cuando termine el onboarding — dejá el árbol listo y dilo explícitamente.

## Próximo bloque
**K1 — Arquitectura, ADRs y proceso de trabajo** (2 bloques). Objetivo: poder explicar la arquitectura en una pizarra y defender las decisiones más grandes, incluyendo las que se corrigieron. Ver sección 4 del plan para las subtareas exactas antes de empezar.
