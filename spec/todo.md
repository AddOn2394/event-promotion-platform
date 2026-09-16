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

---

## 2026-09-16 (Gate 1 — Deploy pipeline, EN PROGRESO, no cerrado)

Se preparó el pipeline de deploy pero **no se verificó de punta a punta** — Gate 1 queda abierto, no cerrado. Ver detalle de lo pendiente abajo.

Trabajo hecho:
- `apps/api/Dockerfile` y `apps/web/Dockerfile`: build multi-stage (`node:22-alpine`), con contexto de build = raíz del monorepo (no la subcarpeta del servicio), porque ambos dependen del `dist/` compilado de `packages/shared-types` (mismo orden que `npm run build` en la raíz). El stage `runner` copia el árbol `/app` completo del builder (`node_modules`, `packages/shared-types`, `apps/<servicio>`) en vez de reinstalar con `--omit=dev`, para no romper los symlinks relativos que crea `npm workspaces` entre `node_modules/@event-promotion/*` y `packages/`/`apps/*`. Cada Dockerfile solo copia el `package.json` de los workspaces que realmente construye (`shared-types` + el propio servicio) — verificado con una prueba aislada (`npm ci` con el `package.json` de un workspace no-relacionado ausente, pero listado en `package-lock.json`) que `npm ci` no requiere que estén presentes los `package.json` de workspaces de los que no depende nada de lo que se está instalando; la primera versión copiaba los tres sin necesidad, corregido tras una pregunta del usuario.
- `docker-compose.yml` en la raíz: `postgres` (16-alpine, healthcheck `pg_isready`), `api` y `web` construidos desde los Dockerfiles de arriba, `DATABASE_URL` armado desde variables de Postgres. `api` espera a que `postgres` esté `healthy` antes de arrancar. Ningún código todavía se conecta a `DATABASE_URL` (eso es Gate 2) — solo queda cableado.
- `GET /health` en `apps/api` (respuesta estática `{status:"ok"}`, sin lógica de negocio, tal como pide el exit criterio).
- `apps/web/vite.config.ts`: se agregó `preview.host: true` y `preview.allowedHosts: [".railway.app"]` — Vite 6 bloquea por default el header `Host` del preview server con un dominio no reconocido, y el dominio público que asigna Railway es dinámico (subdominio de `railway.app`).
- `.dockerignore` en la raíz (excluye `node_modules`, `dist`, `.git`, etc. del build context).
- Credenciales de Postgres movidas a `.env` (gitignorado) con `.env.example` commiteado como plantilla — el usuario marcó explícitamente durante la sesión que no quiere ningún valor hardcodeado en código/config, ni siquiera para desarrollo local.

Durante `/code-review`, se encontró y corrigió un bug real que habría roto el build en Railway sin avisar en ningún chequeo local: ningún Dockerfile copiaba `tsconfig.base.json` de la raíz, pero los tres `tsconfig.json` de los workspaces (`packages/shared-types`, `apps/api`, `apps/web`) lo extienden vía `../../tsconfig.base.json` — el primer `RUN npm run build -w packages/shared-types` habría fallado (`tsc` no encuentra el archivo). Se agregó `tsconfig.base.json` al `COPY` inicial en ambos Dockerfiles. Se verificó con grep que ningún otro `tsconfig.json` referencia archivos fuera de su propio workspace, y que `vite` (dependencia de `apps/web`, usada en runtime por `npm run preview`) está hoisteado al `node_modules` raíz que sí se copia completo al `runner` — no hay una segunda instancia del mismo bug.

**Corrección posterior (misma sesión, a pregunta del usuario)**: el `COPY` inicial de `npm ci` en ambos Dockerfiles copiaba de más — `apps/api/Dockerfile` copiaba también `apps/web/package.json` (y viceversa) asumiendo sin probarlo que `npm ci` en un monorepo con `npm workspaces` exige que estén presentes los `package.json` de **todos** los workspaces listados en el glob `"workspaces"` de la raíz. Se verificó con una prueba aislada (lockfile con 3 workspaces, se borra el `package.json` de uno no relacionado, `npm ci` con npm 10.8.2 — mismo pin que el proyecto) que eso es falso: `npm ci` no necesita el `package.json` de un workspace del que nada depende. Se corrigieron ambos Dockerfiles para copiar solo lo que cada uno realmente construye (`shared-types` + el propio servicio).

**Verificación local con Docker completada** (sesión continuada tras resolver dos problemas de entorno del usuario, no del código):
- Un error inicial de red al bajar `postgres:16-alpine`/`node:22-alpine` desde el registry (CDN cortando la descarga a mitad de camino) — se resolvió reintentando.
- Un error `ports are not available` en el puerto 3000 (otro proceso en el host lo tenía tomado, probablemente de una corrida anterior) — se resolvió con `docker compose down` antes de `up`.
- Un mensaje `invalid length of startup packet` en los logs de Postgres, que resultó ser el usuario probando conectarse al puerto 5432 con un cliente que no habla el protocolo binario de Postgres (no un problema del compose — el puerto sí estaba arriba).
- Confirmado por el usuario: `http://localhost:3000/health` devuelve `{"status":"ok"}` y `http://localhost:4173` sirve la página placeholder de `apps/web`, ambos vía `docker compose up --build`.

**Lo que falta y por qué Gate 1 todavía no cierra**:
- **Railway**: el usuario creó el proyecto (tuvo que resolver un bloqueo de plan Trial vencido/plan Hobby por su cuenta), pero todavía no existen los 2 servicios (`api`, `web`) ni el addon de Postgres administrado, ni se generaron dominios públicos. Se le dejaron instrucciones para hacerlo desde el dashboard web (celular, sin necesitar el CLI): no fijar "Root Directory" en ningún servicio, sino la variable `RAILWAY_DOCKERFILE_PATH` (`apps/api/Dockerfile` / `apps/web/Dockerfile`) para que el build context siga siendo la raíz del repo.
- Ni `GET /health` ni la página de `apps/web` fueron confirmadas respondiendo por **URL pública** todavía (exit criterio explícito del gate) — solo se verificó local vía `docker compose`.

**Nota para Gate 2 (no bloquea Gate 1)**: `preview.allowedHosts: [".railway.app"]` acepta cualquier subdominio del dominio compartido de Railway, no solo el propio — a esta altura es inofensivo porque `apps/web` sirve una página placeholder sin estado de auth, pero conviene acotarlo al dominio generado real una vez que exista login/cookies (Gate 2, ADR-011).

**Siguiente paso**: terminar de verificar Gate 1 (build Docker local si el usuario retoma desde la compu, o directamente el primer deploy real en Railway) y confirmar las 2 URLs públicas — ver `spec/next-session-prompt.md`. Recién ahí Gate 1 pasa a cerrado y arranca Gate 2.

---

## 2026-09-16 (Gate 1 — cambio de proveedor: Railway → Render, ADR-014 revisada)

Con Docker ya verificado localmente (ver entrada anterior), se intentó el deploy real en Railway y aparecieron dos bloqueos reales, no de configuración:

1. **`RAILWAY_DOCKERFILE_PATH` como variable de entorno nunca quedó guardado** en el servicio creado desde el dashboard — investigado con el MCP oficial de Railway (`plugin:railway:railway`, autenticado por OAuth durante la sesión): el servicio estaba usando el builder automático "Railpack" (no Docker), con `variableNames: []`. Railpack no puede autodetectar un monorepo con dos apps sin Dockerfile explícito, y falla antes de generar logs de build — de ahí el "There was an error deploying from source" sin log visible que se vio en el dashboard. Se corrigió usando el campo `dockerfilePath` del tool `update-service` del MCP directamente (más confiable que la variable de entorno), y se dejó el servicio `api` existente reconfigurado (`dockerfilePath: apps/api/Dockerfile`, `healthcheckPath: /health`, `DATABASE_URL` seteada vía referencia `${{Postgres.DATABASE_URL}}`).
2. **El plan Free de Railway bloquea deploys nuevos en la región `sfo` en horario pico** (8am-8pm hora de Los Ángeles) salvo que se pague el plan Hobby ($5/mes) — apareció al intentar crear el servicio `web`. El usuario había resuelto un bloqueo similar al crear el proyecto (mencionado en la entrada de Gate 1 anterior) sin pagar, pero este es un límite distinto y más granular. El usuario confirmó explícitamente que no va a pagar nada por el hosting de este proyecto, y descartó también la opción de crear una cuenta nueva para evadir el límite (viola términos de servicio de Railway).

**Decisión**: se cambió de proveedor a **Render**, que sí tiene free tier real (sin tarjeta de crédito) para Web Services Docker + Postgres administrado — ver ADR-014/ADR-015 revisada en `spec/DECISIONES_ARQUITECTURA.md` para el detalle completo y el trade-off aceptado (Postgres free de Render expira a los 30 días, Web Services free duermen tras 15 min de inactividad).

Cambios de código para el nuevo proveedor:
- `render.yaml` nuevo en la raíz: Blueprint de Render declarando los 3 servicios (`event-promotion-api`, `event-promotion-web`, tipo `web`/`runtime: docker`, `plan: free`; `event-promotion-db`, Postgres `plan: free`), con `dockerfilePath`/`dockerContext` apuntando a cada Dockerfile pero build context = raíz del repo (mismo patrón que ya usaban los Dockerfiles), y `DATABASE_URL` de `api` cableada vía `fromDatabase`.
- Comentarios de cabecera en `apps/api/Dockerfile` y `apps/web/Dockerfile` actualizados (ya no mencionan `RAILWAY_DOCKERFILE_PATH`, apuntan a `render.yaml`).
- `apps/web/vite.config.ts`: `preview.allowedHosts` cambiado de `.railway.app` a `.onrender.com`.
- `docker-compose.yml` no cambia — sigue siendo válido para desarrollo local, es independiente del proveedor de deploy.

**Pendiente para el usuario** (no ejecutable por el asistente, requiere cuenta/OAuth de Render que no existe todavía): crear cuenta en Render (sin tarjeta), conectar el repo de GitHub, y usar "New +" → "Blueprint" apuntando a este repo — Render debería detectar `render.yaml` solo y proponer crear los 3 recursos. El servicio `api`/`web`/Postgres que quedaron configurados en Railway durante esta sesión se dejan sin borrar por ahora (el usuario no confirmó si quiere eliminarlos) — no cuestan nada mientras no se les asigne el plan pago.

**Siguiente paso**: el usuario crea la cuenta de Render y aplica el Blueprint; retomar para confirmar el deploy y las URLs públicas — ver `spec/next-session-prompt.md` (actualizar antes de cerrar la sesión).
