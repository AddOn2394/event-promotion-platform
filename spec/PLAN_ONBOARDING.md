# Plan de Onboarding Técnico — Fase 2 (Transferencia de conocimiento)

> Versión: 1.1 | Fecha: 2026-09-21 | Estado: **K0 en curso (ver tablero, sección 7)**; grilla ratificada por el líder
> Fase 1 = construcción de la plataforma (Gates 0–8, ver `PLAN_DESARROLLO.md`). Fase 2 = este documento: que el nuevo desarrollador **domine y pueda defender** todo el código.
> Los hallazgos que aparezcan se anotan en `ONBOARDING_HALLAZGOS.md`. **No se desarrolla nada en esta fase.**

---

## 0. Propósito, perfil y reglas

**Objetivo**: que el alumno pueda, sin apoyo, (a) explicar qué hace la plataforma y por qué cada decisión importante es la que es, (b) trazar cualquier request de punta a punta (React → Express → Postgres → correo), (c) defender los puntos difíciles —concurrencia, seguridad, contrato compartido, despliegue— ante un entrevistador técnico, y (d) decir con honestidad qué haría distinto y qué está flojo.

**Perfil calibrado en la entrevista inicial (2026-09-21)**:

| Dimensión | Respuesta | Consecuencia en el plan |
|---|---|---|
| Ante quién defiende | **Panel multidisciplinario en español** (confirmado 2026-09-21): un experto en **Docker**, uno en **frontend**, uno en **backend**, uno en **CI/CD** y un **project owner**, cada uno preguntando desde su especialidad; **sin fecha conocida**; sin live coding | Cada gate cierra con preguntas duras "de entrevistador". K13 se organiza como panel (sección K13). Como no hay fecha, **el plan debe ser defendible en cualquier corte**: los cinco carriles con cobertura distinta de cero desde el checkpoint del día 2. |
| Base débil | **Las cuatro áreas**: SQL transaccional y concurrencia · autenticación y seguridad · React/TanStack Query/formularios · Docker/Render/Resend | Todo gate empieza con "Fundamentos previos" desde cero, no asume nada. |
| Técnicas | Trazar de punta a punta · predecir antes de ejecutar · romper y falsificar en un worktree · simulacro de defensa por gate | Las cuatro están en el protocolo de sesión (sección 2). |
| Ritmo | Intensivo, 1–2 semanas | 10 días × 4 bloques de ~90 min = 40 bloques (sección 3). |

**Rol del mentor**: el senior que diseñó, implementó y desplegó la app. Habla de las decisiones en primera persona ("elegí X porque…"), pero **siempre con evidencia** (archivo, ADR, test). Si algo no está respaldado por el código o los ADRs, lo dice ("eso no lo puedo afirmar, verifiquémoslo") en vez de inventar una justificación. Un entrevistador detecta una racionalización a posteriori; el alumno tiene que aprender la razón real, incluyendo las decisiones que se corrigieron.

### Reglas de la fase (no negociables)

1. **Cero desarrollo.** No se modifica nada en `apps/` ni `packages/`. Único caso permitido: los experimentos de *romper y falsificar*, que ocurren **solo dentro de un `git worktree` descartable** (`git worktree add ../epp-lab`, ya **preparado según la sección 0.1**: un worktree recién creado no corre tests), nunca en el árbol principal, y se revierten al terminar cada experimento. Nada de eso se commitea ni vuelve al árbol principal.
2. **Todo hallazgo se anota, no se arregla.** Cualquier deficiencia, riesgo, deuda, inconsistencia de docs o detalle mejorable va a `ONBOARDING_HALLAZGOS.md` con ID, evidencia y severidad. Arreglarlo sería una nueva fase de desarrollo con su propio gate.
3. **Evidencia o silencio.** Toda afirmación técnica se ancla a un archivo, un ADR, un test o una salida real. No se enseñan cosas "que seguramente son así".
4. **Predecir antes de ejecutar.** Cuando se corre algo (una query, un test, un request), el alumno escribe primero su predicción; recién después se ejecuta y se contrasta. La predicción equivocada es lo más valioso de la sesión.
5. **Ningún gate se cierra sin aprobar su simulacro** (rúbrica en la sección 2).
6. **Commits: solo el líder del proyecto**, como en toda la Fase 1. Esta fase solo edita documentos de `spec/` y el índice de `README.md`; el asistente nunca hace `git commit`. **Decisión del líder (2026-09-21): no se hace commit de nada de la fase hasta que el onboarding termine.** Consecuencia asumida: la Fase 2 vive **sin commitear durante ~10 días**, que es exactamente la condición que ya hizo perder trabajo en H-025. Mitigación obligatoria, sin commit: el mentor **termina cada sesión listando los archivos sin commitear** y recomienda una copia de respaldo de `spec/` fuera del repositorio; antes de cualquier operación que pueda descartar cambios (`git checkout`, `restore`, `reset`, `stash`, borrar el worktree) se revisa `git status`.
7. **Español, sin relleno.** Se explica con analogías cuando el concepto es nuevo y con vocabulario técnico exacto (el que usará el entrevistador) cuando ya se entendió. Cada término nuevo entra al glosario del alumno con su nombre en inglés.
8. **Producción es de solo lectura, con una excepción cuidada.** Se puede mirar (`/health`, la web, correos recibidos, dashboards). Los intentos de login **fallidos** contra `/admin/auth/login` o `/auth/login` **se persisten** (`intentos_fallidos_login`) y con 5 por email en 15 minutos bloquean esa cuenta (ADR-022; el contador no es atómico, H-002, pero cuenta). Regla: en producción los caminos de fallo se prueban **solo con un email inventado** (`nadie@example.com`), **nunca** con el email real del administrador ni de un cliente.

### 0.1 Preparar el laboratorio (se hace en K0.6; sin esto, las tareas [F] gastan un bloque en configuración)

Un `git worktree add` crea el código pero **no** `node_modules` ni `packages/shared-types/dist`, y por defecto compartiría la base `event_promotion_test` con el árbol principal. Como las fixtures de `apps/api` hacen `TRUNCATE`, y `fileParallelism: false` solo protege dentro de **un** proceso, dos árboles corriendo tests a la vez se corrompen entre sí.

1. `git worktree add ../epp-lab` (desde el árbol principal, sin cambios sin guardar).
2. En `../epp-lab`: `npm install` — **puede tardar más de 2 minutos**; correrlo en segundo plano.
3. `npm run build -w packages/shared-types` (api y web consumen su `dist/`).
4. **Base propia del laboratorio**: exportar `DATABASE_URL` apuntando a `…/event_promotion_lab`, correr `npm run test:db:setup -w apps/api` y `npm run db:migrate -w apps/api` (verificar que el script acepta ese nombre). Alternativa si no se crea: **un solo árbol corre tests de api a la vez**, nunca los dos.
5. Comprobar que el laboratorio pasa `npm run test -w packages/shared-types` **antes** de romper nada (línea base verde).
6. Al terminar cada experimento: revertir el cambio **siempre con `git -C ../epp-lab checkout -- .`** —y **nunca** con un `git checkout -- .` pelado, que ejecutado desde el árbol principal **descarta los documentos sin commitear de toda la fase** (la misma clase de pérdida de H-025, con una ventana de ~10 días)—. Antes de revertir, `git -C ../epp-lab status` para confirmar que solo hay cambios del experimento; después, la suite en verde otra vez. Al cerrar la sesión: `git worktree remove ../epp-lab` (o dejarlo si se va a reutilizar al día siguiente). La forma con `-C` es inequívoca desde cualquier directorio: por eso es la única permitida.

---

## 1. Mapa del sistema (lo que el alumno va a dominar)

**Producto**: plataforma de confirmación de asistencia para una feria anual de promociones. Ventas invita a un cliente (correo + código de 6 dígitos); el cliente entra, elige servicios/productos y un horario, ve su descuento en vivo y confirma; puede editar hasta un plazo, cambiar de horario o cancelar. Ventas administra catálogo, horarios, umbrales de descuento y exporta las confirmaciones.

**Tamaño real (código productivo, sin tests)**: `apps/api` ≈ 3.070 líneas · `apps/web` ≈ 2.930 · `packages/shared-types` ≈ 1.130 → **≈ 7.100 líneas**. Tests: 14 archivos en api, 16 en web, 4 en shared-types. 11 migraciones SQL, 31 ADRs, 12 historias de usuario, 27 endpoints.

```
packages/shared-types   ← FUENTE DEL CONTRATO (ADR-003): schemas Zod, motor de descuento,
   │                       formateador de dinero, mensajes de error en español, OpenAPI
   ├──► apps/api   (Express + pg)   dominios: admin · auth · catalog · slots · registration · webhooks
   │                                shared: jwt, cookies, rate-limit, mailer, email/*, notificaciones, db-transaction
   └──► apps/web   (React + Vite + Tailwind v4)   features: auth · registration · admin · shared/ui
                                                  server-state: TanStack Query · formularios: react-hook-form + Zod
Postgres 16 (11 migraciones, runner propio)  ·  Resend (correo + webhook)  ·  Render (deploy) · Docker
```

**Endpoints (27 documentados en OpenAPI, más `GET /health`)** — `auth`: `POST /auth/login` · `admin`: `POST /admin/auth/login`, `GET|POST /admin/invitaciones`, `POST /admin/invitaciones/{id}/reenviar`, `GET /admin/confirmaciones`, `GET /admin/confirmaciones/export.csv`, `GET|POST /admin/catalogo`, `PATCH|DELETE /admin/catalogo/{id}`, `GET|POST /admin/slots`, `PATCH|DELETE /admin/slots/{id}`, `GET|PATCH /admin/configuracion`, `GET|PATCH /admin/configuracion/descuento` · `cliente`: `GET /catalogo`, `GET /slots`, `GET /configuracion-descuento`, `POST /confirmaciones`, `GET|PATCH /confirmaciones/mia`, `POST /confirmaciones/mia/cancelar` · `sistema`: `POST /webhooks/resend`, `GET /health`.

**Proceso de trabajo que también se defiende** (un entrevistador pregunta *cómo* se construyó): flujo spec-driven (`spec/`), gates con cierre de cinco pasos (tests → `/code-review` → `advisor` → walkthrough → commit del líder), `.claude/CLAUDE.md` con las reglas del proyecto, hook que bloquea `git commit` al asistente, hook de typecheck al guardar, agente `api-contract-documenter`, skill `gate-checklist`, `tasks/lessons.md`.

---

## 2. Protocolo de sesión y rúbrica

Cada **bloque** (~90 min) sigue el mismo ritmo:

| # | Paso | Duración | Qué pasa |
|---|---|---|---|
| 1 | **Repaso activo** | 5–10 | Tres preguntas del bloque anterior, sin mirar notas. |
| 2 | **Objetivo y por qué importa en una entrevista** | 3 | Qué vas a poder explicar al terminar. |
| 3 | **Fundamentos desde cero** | 15–25 | El concepto general (ej. qué es una transacción) *antes* de verlo en el código. Analogía → definición exacta → ejemplo mínimo. |
| 4 | **Lectura guiada del código + traza** | 25–35 | Se recorre el código real archivo por archivo siguiendo un caso concreto. |
| 5 | **Predecir → ejecutar** | 10–15 | El alumno escribe la predicción; se corre; se contrasta. |
| 6 | **Romper y falsificar** (solo si el gate lo marca) | 10–15 | En el worktree: se revierte un fix a propósito y se observa qué test falla y por qué. |
| 7 | **Explicación de vuelta (Feynman)** | 10 | El alumno explica el bloque como si el mentor fuera el entrevistador. |
| 7 bis | **Auditoría del mentor** | 2 | **El alumno elige UNA afirmación de *por qué* que el mentor hizo en el bloque (una decisión, una alternativa descartada, un riesgo) y exige la evidencia**, producida en vivo: un ADR, el nombre de un test, un resultado de `git log` o una ausencia demostrada. **No califica una afirmación de *qué* hace el código** ("`withTransaction` hace `ROLLBACK`"): se autocorrige leyendo el archivo y no prueba nada. Sí califica "¿por qué no `SERIALIZABLE`?", donde un mentor puede inventar una racionalización fluida. Si el mentor no puede producir la evidencia —o su único respaldo es "es práctica estándar" o "es obvio"—, **la afirmación se retracta y queda escrita como retractada en la bitácora**. Es el único mecanismo de la fase que controla al propio mentor: el alumno parte casi de cero y no puede detectar por sí solo una respuesta confiada y equivocada que venga con una ruta de archivo verosímil. Además entrena la habilidad que el panel evalúa: anclar afirmaciones a evidencia y no a fluidez. |
| 8 | **Cierre** | 5 | Se anotan hallazgos (`ONBOARDING_HALLAZGOS.md`) y se actualiza el tablero de la sección 7. |
| 9 | **Bitácora** | 5 | Se escribe la entrada de la sesión (ver "Bitácora de la fase" abajo). **Sin este paso el bloque no cuenta como cerrado**: es lo que permite retomar tras un reinicio de contexto y lo que hace comparables los checkpoints. |

### Bitácora de la fase (cómo sobrevive el proceso a un reinicio de contexto)

La Fase 1 funcionó a lo largo de muchas sesiones porque cada una dejaba `spec/todo.md`, `tasks/lessons.md` y un `next-session-prompt.md` reescrito. La Fase 2 usa **la misma maquinaria**:

1. **Una entrada por sesión en `spec/todo.md`**, con título `## Fase 2 — K# (fecha)` y estas partes: **bloques cursados** (y minutos reales), **preguntas del simulacro con su nota 0–3** (una línea por pregunta, no solo el promedio), **predicciones que fallaron** (qué se predijo, qué pasó, por qué), **analogías que funcionaron o no**, **hallazgos nuevos** (IDs), **qué falta repetir** y **qué sigue**.
2. **El mentor reescribe `spec/next-session-prompt.md` al cerrar cada sesión** (la Fase 1 lo hacía; aquí es obligatorio): gate en curso, qué se aprobó, qué se repite, próximo bloque.
3. **Correcciones del alumno al mentor** ("eso no es así", "explícamelo de otra forma") van a `tasks/lessons.md`.
4. El **colchón** y el **checkpoint del día 2** se deciden leyendo esas entradas, no de memoria. La comparación final de K13 ("diagnóstico final vs. línea base") es **pregunta por pregunta**.

### Tarea continua: tabla de trazabilidad (la construye el alumno; no cuesta bloques)

Desde K0.2 y hasta K13, el alumno arma una tabla **requisito → HU → ADR → código → test**: una fila por requisito del PDF/`SPEC_FUNCIONAL.md` (p. ej. "frontera Q1,500 estricta" → HU-3 → ADR-005 → `packages/shared-types/src/discount-engine.ts` → `discount-engine.test.ts`). Se completa **al cerrar cada gate**, con las filas que ese gate aportó, y se entrega y **defiende en K13.3**. Es lo que vuelve creíble el "conozco mi sistema" ante todo el panel y es la puerta de entrada natural del project owner. **Presupuesto, sin eufemismos**: no tiene bloque propio; consume los 5 minutos del paso 9 de cada bloque (≈ 40 × 5 min ≈ 3 h repartidas) y, **si se atrasa, se paga con el bloque de colchón**, no con bloques de gate. Con 12 HU y 31 ADRs es trabajo real: si al checkpoint del día 2 tiene menos de la mitad de las filas previstas, se declara y se decide entre ampliar el paso 9 o recortar la tabla a las HU críticas (HU-3, HU-4/5, HU-8).

**Etiquetas de técnica** usadas en las tareas: **[T]** traza de punta a punta · **[P]** predecir antes de ejecutar · **[F]** romper y falsificar (worktree) · **[D]** defensa (pregunta de entrevistador).

**Rúbrica de respuesta (0–3)**

| Nota | Significado |
|---|---|
| 0 | No sabe / respuesta incorrecta. |
| 1 | Vaga o memorizada: repite palabras sin poder aplicarlas ni anclarlas al código. |
| 2 | Correcta y anclada a evidencia (archivo/ADR/test). |
| 3 | Correcta, anclada, y además explica el trade-off, la alternativa descartada y qué pasa en el borde. |

**Aprobar un gate**: promedio ≥ **2,0** en el simulacro **y** ningún 0 ni 1 en las preguntas marcadas **★ crítica**. Si no se aprueba, se repite solo lo fallado en el bloque de colchón. **Aprobar la fase**: simulacro final integral (K13) con promedio ≥ **2,3**.

**Niveles de pregunta**: **B** básica (debería salir sin dudar) · **M** media · **D** dura (la que separa a un candidato de otro).

---

## 3. Calendario (10 días × 4 bloques = 40 bloques)

Días hábiles; si un gate no se aprueba, el calendario se desliza usando el colchón.

| Día | B1 | B2 | B3 | B4 |
|---|---|---|---|---|
| **D1** | K0 | K0 | K0 | K1 |
| **D2** | K1 | K2 | K2 | K2 |
| **D3** | K3 | K3 | K3 | K4 |
| **D4** | K4 | K10a | K12a | K12b |
| **D5** | K5 | K5 | K5 | K10b |
| **D6** | K6 | K6 | K6 | K6 |
| **D7** | K7 | K7 | K7 | K10c |
| **D8** | K8 | K8 | K9 | K9 |
| **D9** | K10d | K11 | K12c | colchón |
| **D10** | K13 | K13 | K13 | K13 (cierre) |

> ✔ **Grilla ratificada por el líder el 2026-09-21**, con la opción (a) para CI/CD: las subtareas K12.7 a, b, d, e van en K12b (D4) y K12.7 c, f en K12c (D9). Autoevaluación 0–3 de K0.1a omitida por decisión del líder; la línea base es solo el diagnóstico de 20 preguntas.

Bloques por gate: K0=3 · K1=2 · K2=3 · K3=3 · K4=2 · K5=3 · K6=4 · K7=3 · K8=2 · K9=2 · **K10=4 (a–d)** · K11=1 · **K12=3 (a–c)** · colchón=1 · **K13=4** → **40**.

**Gates partidos (K10 y K12).** Para que Frontend, Docker y CI/CD tengan contenido formal antes de D5 sin romper prerrequisitos, K10 y K12 se cursan en bloques separados por días (contenido de cada bloque en la sección de su gate). Reglas: (1) **el simulacro del gate se toma en su último bloque** (K10d, K12c) y el tablero de la sección 7 muestra 🟨 desde el primer bloque; (2) cada bloque parcial abre con el repaso activo de los anteriores del mismo gate; (3) el prerrequisito real de K12 es **K11 antes de K12.7c** (el pipeline de CI), no antes de todo K12: K12a y K12b no dependen de K11.

**Cobertura por carril del panel** (como no hay fecha, se debe poder defender en cualquier corte). **Antes de D5** (D1–D4): **backend** K2, K3, K4 · **frontend** trazas de K0.4 y **K10a** (fundamentos de React + estructura y arranque, D4) · **Docker** K0.3, K1 y **K12a** (imágenes y compose a nivel especialista, D4) · **CI/CD** contacto mínimo en K1.4d (D2) y **K12b** (D4: K12.7 a, b, d, e — estado real, costo de H-025, despliegue automático, qué no llevaría el pipeline; no dependen de K11) · **project owner** K0.2 (D1), K3 (reglas de HU-3 y HU-12 con sus fronteras) y las filas de la tabla de trazabilidad de cada gate; **es el carril más delgado antes de D5** y su bloque formal es K8 (D8) más K12c/K13. **Después de D5**: backend K5–K9, frontend K10b–d, CI/CD completo en K12c (pipeline escrito, D9). Ningún carril está en cero al llegar al checkpoint del día 2.

**Carga real**: 40 bloques × 90 min ≈ **60 horas en 10 días**, con fundamentos desde cero en las cuatro áreas y un solo bloque de colchón. Es apretado a propósito (el líder pidió ritmo intensivo), por eso hay un control temprano:

> **Checkpoint obligatorio al final de D2** (cuando ya se cursaron K0, K1 y K2 = **8 bloques**): comparar bloques consumidos contra el presupuesto, y los simulacros aprobados contra los previstos. **En cada checkpoint, además, confirmar que los cinco carriles (backend, frontend, Docker, CI/CD, project owner) tienen cobertura distinta de cero.** Si K0–K2 consumió más de 9 bloques o algún simulacro quedó por debajo de 2,0, **se decide ese mismo día** entre: (a) alargar la fase a 12 días, (b) recortar K13 de 4 a 3 bloques fusionando K13.4 (bug hunt y retrospectiva) en K13.3 (repreguntas cruzadas), o (c) fusionar K10c y K10d en un solo bloque (K10.7 y K10.8 pasan a lectura; el "fundamentos" de K10 ya se dio en K10a, D4); **(d) si aparece la fecha de la defensa y cae antes de D8** (la fecha hoy es desconocida, así que esto puede ocurrir en cualquier momento), se aplica **este orden de recorte**: se **priorizan K3, K5, K6, K11, K12c y K13** (K12a y K12b ya están hechos desde D4; K12c entra porque el panel incluye a CI/CD y su pipeline escrito es lo que falta); **K8 y K9 pasan a lectura guiada** de un bloque conjunto; **K11 se conserva** aunque sea comprimido, porque K12.7c depende de él; K10 se reduce a la traza de `ConfirmarPage` y el mapa de `Field`/`shared/ui` (K10a y K10b ya están hechos). Se registra en la bitácora qué carriles del panel quedaron con menos cobertura y se le dice al líder. **No** se descubre el desfase en D7 ni se lo deja comerse K13.
>
> **Un bloque puede interrumpirse a la mitad** (límite de gasto o de sesión, reinicio de contexto: le pasó a la sesión que preparó este plan). Por eso la **entrada de bitácora se escribe antes de abandonar el bloque**, aunque quede a medias, con lo cursado hasta ese punto. Y el checkpoint del día 2 revisa **también si el presupuesto de horas aguanta** (no solo el calendario): si las interrupciones ya consumieron más de un bloque, se aplica (a), (b) o (c).

**Por qué este orden**: primero el *porqué* y el mapa (K0–K1), después los datos (K2), el contrato y la lógica pura que no tiene I/O (K3), el backend en capas (K4), seguridad (K5), y la concurrencia (K6) cuando ya hay base de SQL y de transacciones. Los flujos de negocio (K7–K8) son la integración de todo lo anterior. **Docker, CI/CD y frontend entran antes de D5 partiendo K12 y K10** (K12a y K12b en D4, K10a en D4), porque el panel incluye a un experto en Docker, otro en CI/CD y otro en frontend y no se sabe cuándo será la defensa; K10a va después de K3 y K4 (el contrato y HTTP ya se dominan). **K11 (D9B2) precede a K12c (D9B3)** porque **K12.7c depende de K11** (el pipeline se diseña sobre lo que K11 enseña: base real por ADR-017, fixtures con `TRUNCATE`, `fileParallelism: false`), y K11 va después de K6–K9 porque su mapa regla→test los necesita. SQL (K2) y transacciones (K4.5) preceden a K6; K5 precede a K10b (sesión y 401) y a K12c (producción real); K7 precede a K10d (pantallas del cliente). K13 es entrevista real.

---

## 4. Gates de conocimiento

> **Convención**: `K#` = gate de conocimiento · `K#.#` = tarea · `K#.#.a` = subtarea. "Evidencia" lista dónde vive la verdad en el repo. "Fundamentos previos" es lo que el mentor enseña **desde cero** antes de tocar el código.

---

### K0 — Orientación, entrevista de calibración y entorno funcionando (3 bloques)

**Objetivo**: entender el problema de negocio, tener la app corriendo en tu máquina y fijar el punto de partida contra el que se medirá el progreso.
**Fundamentos previos**: qué es un monorepo y un workspace de npm · qué hace cada proceso (Postgres, API, web) · qué es una variable de entorno y por qué no se commitea.
**Evidencia**: `README.md` · `spec/SPEC_FUNCIONAL.md` (roles, HU-1…HU-12) · `.env.example` · `docker-compose.yml` · `tasks/lessons.md` (sección de entorno).

| Tarea | Subtareas |
|---|---|
| **K0.1 Entrevista de calibración** (modo entrevista profunda) | a. Autoevaluación 0–3 sobre ~40 conceptos (lista en el apéndice A). · b. **Ya confirmado el 2026-09-21 (no volver a preguntar)**: disponibilidad de **6 h o más por día** y defensa en **1 a 2 semanas** → el calendario de 10 días × 4 bloques queda **ratificado**; H-015 y H-020 se enseñan como hallazgos vivos. **Respondidas el 2026-09-21 (no volver a preguntar)**: fecha exacta de la defensa → **desconocida, no se va a saber** (el plan debe seguir defendible en cualquier corte); rol y stack → **panel multidisciplinario, con el stack definido por este proyecto** (no hay un stack externo que estudiar); idioma → **todo en español** (los términos en inglés del Apéndice B se aprenden igual, porque son nombres de herramientas); código ya leído → **≈ 30 %, solo lo de Gates 0–2**; parte donde se siente más seguro → **ninguna**; menos seguro → todas. *(Formato ya respondido: **sin live coding**, solo conversación y explicar el código; K13 no cambia.)* · c. **Diagnóstico inicial**: 20 preguntas (5 por cada área débil) sin ayuda; se guarda el resultado como línea base. |
| **K0.2 El problema de negocio** | a. Leer el PDF de la prueba (resumido en la spec) y reformularlo con tus palabras. · b. Los dos roles: ventas y cliente. · c. Las 12 HU en una línea cada una. · d. Reglas de negocio que un entrevistador va a probar: descuento por categoría, frontera Q1,500 estricta, cupo por horario, plazo de edición, código que nunca es anónimo. |
| **K0.3 Levantar todo en local** [P] | a. `docker compose up -d postgres`. · b. Variables de entorno reales (incluido `DATABASE_URL`, que **no** está en `.env.example`: es la trampa documentada en `tasks/lessons.md`). · c. `npm install`, `build` de `shared-types`, `db:migrate`, `db:seed`. · d. `dev:api` + `dev:web`. · e. Verificar con un request que **use la DB**, no solo `/health` (`/health` da 200 aunque la DB esté mal). · f. Predecir y luego correr `npm run test` (¿cuántos tests hay? ¿cuáles necesitan Postgres?). |
| **K0.4 Recorrido de la interfaz** [T] | a. Panel de ventas: login, invitar. · b. Cliente: login con código, confirmar, ver recibo, editar, cancelar. · c. Ver el correo real que llega. · d. Anotar cualquier cosa que llame la atención (primer aporte al registro de hallazgos). |
| **K0.5 Pitch de 2 minutos** | Escribir y decir en voz alta qué es la plataforma, para quién, qué garantiza y qué la hace técnicamente interesante. Se regraba al final (K13) para comparar. |
| **K0.6 Preparar el laboratorio** | Seguir la sección 0.1 completa (worktree + `npm install` en segundo plano + build de `shared-types` + base `event_promotion_lab` + línea base verde). Se lanza el `npm install` **al inicio del bloque** para que termine mientras se hacen K0.2–K0.5. |

**Entregable**: app corriendo + línea base del diagnóstico + pitch v1 + laboratorio en verde.
**Simulacro K0** — **B** ¿Qué problema resuelve y quién la usa? ★ · **B** ¿Por qué no es un formulario público? (ADR-011) ★ · **M** ¿Qué es cada proceso que levantaste y en qué puerto? · **M** ¿Por qué `/health` en verde no prueba que la app funcione? · **D** Si te pidieran ejecutar esto en otra máquina sin ayuda, ¿en qué orden y qué te puede fallar?
**Puertas de salida**: [x] app + tests corriendo (2026-09-22: 258/258 verde, salida real en `spec/todo.md`) · [x] diagnóstico guardado (sección 7) · [x] pitch v1 dicho de corrido (2026-09-22, texto en `spec/todo.md`) · [x] preguntas abiertas respondidas (fecha, rol, formato — sesión 2) · [x] laboratorio con la suite de `shared-types` en verde (2026-09-22: 50/50, base `event_promotion_lab` migrada 11/11).

---

### K1 — Arquitectura, ADRs y proceso de trabajo (2 bloques)

**Objetivo**: poder explicar la arquitectura en una pizarra y defender las decisiones más grandes, incluyendo las que se corrigieron.
**Fundamentos previos**: qué es una arquitectura por capas · qué es un ADR y por qué se escribe · qué es *contract-first* · qué es un monorepo y qué cuesta · qué es CI/CD y qué hace (y no hace) este proyecto.
**Evidencia**: `spec/DECISIONES_ARQUITECTURA.md` (ADR-001…031) · `spec/PLAN_DESARROLLO.md` · `spec/ESTADO_PLAN.md` · `.claude/CLAUDE.md` · `.claude/hooks/*` · `.claude/agents/api-contract-documenter.md` · `.claude/skills/gate-checklist/SKILL.md` · `package.json` (workspaces) · `tsconfig.base.json`.

| Tarea | Subtareas |
|---|---|
| **K1.1 Clasificar los 31 ADRs** | a. Agruparlos: stack (001, 002, 016, 020, 021), contrato (003, 025, 031), dominio (004–010, 023), identidad y seguridad (011, 022, 026, 028), notificaciones (024, 030), infra (014/015), proceso (017, 018), correcciones posteriores (027, 029). · b. Para cada grupo: la decisión, la alternativa descartada y el costo aceptado. · c. Marcar cuáles fueron **corregidas** (003, 011, 014, 024…) y qué las corrigió: es lo que más impresiona a un entrevistador porque muestra criterio. |
| **K1.2 Contract-first en la práctica** [T] | a. Seguir un campo (ej. `slotId`) desde su schema en `packages/shared-types` hasta el formulario y el controlador. · b. Cómo se consume el paquete (`dist/`, build en orden, por qué `shared-types` se compila primero). · c. Qué genera `generate-openapi.ts` y para qué sirve el agente `api-contract-documenter`. |
| **K1.3 Escalabilidad y límites conocidos** | Leer ADR-019 y decir en voz alta hasta dónde llega el diseño y dónde se rompería (free tier, un solo evento, cupo por contador, emails síncronos). |
| **K1.4 El proceso** | a. Ciclo de un gate: tests → `/code-review` → `advisor` → walkthrough → commit del líder. · b. Qué evita cada mecanismo (hook de commit, typecheck al guardar). · c. Leer `spec/todo.md` como bitácora: cómo se ven las decisiones corregidas. · d. **Contacto mínimo con CI/CD (carril del panel desde el día 2)**: por qué **no hay CI** (H-022), qué lo suple hoy (los gates y los dos hooks, que **no fuerzan nada**) y qué costó (H-025). El pipeline completo se escribe en K12.7. |
| **K1.5 Dibujar de memoria** | Diagrama de componentes + flujo "confirmar asistencia" en 5 minutos, sin mirar. |

**Simulacro K1** — **B** ¿Por qué monorepo con workspaces? (ADR-002) ★ · **B** ¿Qué es `shared-types` y por qué es la fuente del contrato? (ADR-003) ★ · **M** ¿Por qué Postgres y no Mongo? (ADR-021) · **M** ¿Por qué no hay tests e2e de UI? (ADR-017) — ¿qué riesgo asumiste? · **D** Nombra tres ADRs que se corrigieron, qué falló en la versión original y cómo se detectó. ★ · **D** ¿Qué cambiarías de la arquitectura si el evento fuera 100 veces más grande?
**Puertas de salida**: [ ] tabla de 31 ADRs propia · [ ] diagrama de memoria · [ ] las 3 correcciones explicadas.

---

### K2 — Modelo de datos y SQL desde cero (3 bloques)

**Objetivo**: leer el esquema completo, escribir y predecir consultas, y explicar por qué cada constraint existe.
**Fundamentos previos**: tabla, fila, clave primaria y foránea · `SELECT/INSERT/UPDATE/DELETE` · `JOIN` y `LEFT JOIN` · agregados y `GROUP BY` · índices · `UNIQUE`, `CHECK`, `NOT NULL` · `TIMESTAMPTZ` y zonas horarias · qué es una migración y por qué son inmutables · `LATERAL` y `json_agg` (solo lo que aparece en el código).
**Evidencia**: `apps/api/migrations/0001…0011` · `apps/api/src/db/{migrate,seed,seed-catalogo,pool,create-test-db}.ts` · `spec/SPEC_FUNCIONAL.md` (modelo de datos) · ADR-006, 007, 008, 021.

| Tarea | Subtareas |
|---|---|
| **K2.1 Leer las 11 migraciones en orden** | a. Una por una: qué agrega y por qué en ese momento (ej. `0008` agrega `cupos_disponibles` con backfill en tres pasos por el `NOT NULL`). · b. Dibujar el diagrama entidad-relación de memoria. · c. Tabla de constraints: cada `UNIQUE`/`CHECK`/`FK` y el bug concreto que evita. |
| **K2.2 Los patrones no obvios** | a. **Snapshot** de precio/nombre/umbrales al confirmar (ADR-006, ADR-023): por qué nunca se recalcula. · b. **Soft-delete** (`activo`) y su costo en cada query (ADR-007). · c. **Tablas singleton** (`configuracion_descuento`, `configuracion_evento`) con índice único sobre `((true))`. · d. `UNIQUE(idinvitacion)` en confirmaciones y cómo permite reconfirmar reutilizando la fila. · e. `intentos_fallidos_login` + `scope` (migración 0011). |
| **K2.3 Consultas guiadas contra la DB de dev** [P] | Diez consultas, cada una precedida de su predicción: cuántas confirmaciones hay por estado, cupo restante por slot, invitaciones sin respuesta, última notificación por invitación (`LATERAL`), qué pasa si se viola cada constraint a propósito dentro de `BEGIN … ROLLBACK`. |
| **K2.4 Migrador y seed** | a. `migrate.ts`: tabla `schema_migrations`, cada archivo en su transacción, idempotencia. · b. `seed.ts` ("omitir si la tabla tiene datos") vs `seed-catalogo.ts` (aditivo, comando aparte) y por qué se separaron. · c. Base de test aparte y por qué las fixtures hacen `TRUNCATE`. |
| **K2.5 Falsificar un constraint** [F] | En el worktree, quitar el `CHECK (cupos_disponibles >= 0)` y correr los tests de concurrencia: ver cuál falla y con qué error. |

**Simulacro K2** — **B** ¿Por qué el dinero es entero en centavos? (ADR-005) ★ · **B** ¿Qué diferencia hay entre `UNIQUE` y clave primaria? · **M** ¿Por qué se guarda un snapshot en vez de hacer `JOIN` al catálogo? ★ · **M** ¿Qué pasa si editas el catálogo después de que alguien confirmó? · **M** ¿Por qué el soft-delete y no `DELETE`? · **D** ¿Por qué `TIMESTAMPTZ` y qué bug produce `TIMESTAMP` en un evento con horarios? · **D** Explica el `LEFT JOIN LATERAL` de "última notificación" y qué pasaría con un `JOIN` normal. · **D** ¿Cómo agregarías una columna `NOT NULL` a una tabla con datos, sin downtime? (mirar `0008`).
**Puertas de salida**: [ ] ER de memoria · [ ] 10 consultas predichas · [ ] tabla de constraints propia.

---

### K3 — Contrato compartido y lógica pura: Zod, motor de descuento, dinero (3 bloques)

**Objetivo**: entender el paquete que ambas apps comparten, dominar el motor de descuento (lo primero que un entrevistador probará) y saber por qué el dinero se maneja como se maneja.
**Fundamentos previos**: qué es un schema y qué es validar en la frontera · tipos inferidos vs. tipos escritos a mano · función pura y por qué es testeable sin DB · aritmética de enteros y por qué `0.1 + 0.2 ≠ 0.3` · redondeo *half up* vs. *banker's*.
**Evidencia**: `packages/shared-types/src/*` · tests `discount-engine.test.ts`, `descuento.test.ts`, `money.test.ts`, `mensajes.test.ts` · ADR-003, 004, 005, 016, 023, 025, 031 · `SPEC_FUNCIONAL.md` HU-3 y HU-12.

| Tarea | Subtareas |
|---|---|
| **K3.1 Anatomía del paquete** | a. Un archivo por dominio (`admin`, `auth`, `catalogo`, `confirmaciones`, `slots`, `configuracion`, `descuento`, `webhooks`, `primitives`). · b. `index.ts` como barril y el efecto de `z.setErrorMap` (mensajes en español). · c. `generate-openapi.ts` (459 líneas registrando rutas a mano): ventaja y riesgo. |
| **K3.2 El motor de descuento** [P][F] | a. Regla por categoría, "gana el tier más alto", frontera Q1,500 **estricta** (>, no ≥). · b. Lista de reglas (predicado + %) evaluada de mayor a menor: por qué es *abierto/cerrado* (ADR-023). · c. **Tabla de fronteras**: predecir el resultado de 15 casos (2 servicios a Q1,500.00 → 3 %; a Q1,500.01 → 5 %; 2/3/4/5 productos; ítem de precio 0) y contrastar con `discount-engine.test.ts`. · d. [F] En el worktree cambiar `>` por `>=` y ver exactamente qué test falla. · e. Por qué `apps/web` y `apps/api` importan **la misma función** (ADR-025) y por qué el cliente nunca es autoritativo. |
| **K3.3 Dinero** | a. Centavos enteros de punta a punta; `MontoIngresadoSchema` y `MONTO_MAXIMO_CENTS` (cabe en `INTEGER`). · b. `formatearCents` (`Q1,500.00`, sin `Intl`, lanza `RangeError` con no enteros) (ADR-031). · c. Por qué el CSV **no** lleva separador de miles. · d. `apps/web/src/shared/money-input.ts`: parseo con aritmética entera (por qué no `parseFloat × 100`). |
| **K3.4 Mensajes de error en español** | La causa raíz (Zod emite inglés; el formulario muestra `error.message` tal cual; el API devolvía un objeto que `apiFetch` no leía) y el arreglo estructural + `mensajes.test.ts`. |
| **K3.5 Validar en la frontera** | Dónde se hace `.parse()` en cada controlador y por qué también se parsea la **respuesta**. |

**Simulacro K3** — **B** ¿Qué gana: 3 % o 5 % con 3 servicios de Q600 cada uno? ★ · **B** ¿Por qué el descuento se calcula también en el servidor si el cliente ya lo muestra? ★ · **M** ¿Por qué `packages/shared-types` y no duplicar el motor? (ADR-025) · **M** ¿Cómo agregarías un tercer tier sin tocar las reglas existentes? (ADR-023) · **D** ¿Por qué `parseFloat("19.99") * 100` es peligroso? Da un caso concreto. · **D** ¿Qué es el redondeo *banker's* y en qué caso del test fallaría? · **D** Una regla nueva combina servicios y productos: ¿cabe en el diseño de reglas actual? ¿Qué cambiarías?
**Puertas de salida**: [ ] tabla de fronteras predicha · [ ] falsificación de la frontera vista · [ ] mapa del paquete propio.

---

### K4 — Backend: ciclo de request y capas (2 bloques)

**Objetivo**: trazar cualquier request dentro de Express sabiendo qué middleware corre, en qué orden y por qué.
**Fundamentos previos**: qué es HTTP (método, ruta, cabeceras, cuerpo, códigos de estado) · qué es un middleware · qué es un pool de conexiones · qué es CORS y por qué existe · promesas y `async/await`.
**Evidencia**: `apps/api/src/{app,index}.ts` · `<dominio>/{routes,controller,service}.ts` · `shared/{async-handler,http-error,pg-error,db-transaction}.ts` · `db/pool.ts` · ADR-020.

| Tarea | Subtareas |
|---|---|
| **K4.1 Orden del pipeline** [T] | `cors` → `webhooksRouter` (**antes** de `express.json()` por el body crudo de Svix) → `json` → `cookieParser` → routers → manejador de errores. Por qué ese orden y qué se rompe si se altera. |
| **K4.2 Capas** | `routes` (qué URL y qué guard) → `controller` (parsear entrada/salida con Zod, sin lógica) → `service` (reglas y SQL). Por qué el controlador no tiene lógica de negocio. |
| **K4.3 Manejo de errores** | `HttpError`, `ZodError` → `{ error, campos }`, error inesperado → 500 "Error interno" y `console.error`. Qué ve el cliente y qué queda en el log. |
| **K4.4 Trazar un endpoint simple** [T][P] | `GET /catalogo`: ruta → guard → controlador → `service` → SQL → parse de respuesta → JSON. Predecir la salida y comparar con un `curl`. |
| **K4.5 `withTransaction`** | Leerlo línea por línea. Qué garantiza y qué **no** (ver hallazgo H-003: un `ROLLBACK` que falla puede enmascarar el error original). |

**Simulacro K4** — **B** ¿Qué hace un middleware y en qué orden corren? ★ · **B** ¿Por qué 400, 401, 403, 404, 409, 429 y 500 en este API? Da un ejemplo real de cada uno. · **M** ¿Por qué el webhook se monta antes de `express.json()`? ★ · **M** ¿Qué devuelve el API ante un body inválido y cómo lo muestra la web? · **D** Un `service` lanza un error que no es `HttpError`: recorrido completo hasta el cliente. · **D** ¿Qué pasa con las conexiones del pool si `fn` lanza dentro de `withTransaction`? ¿Y si falla el `ROLLBACK`?
**Puertas de salida**: [ ] pipeline dibujado · [ ] traza de `GET /catalogo` · [ ] tabla de códigos de estado propia.

---

### K5 — Autenticación y seguridad (3 bloques)

**Objetivo**: explicar el modelo de identidad, cada defensa que tiene el sistema y —con honestidad— dónde tiene huecos.
**Fundamentos previos**: hash vs. cifrado · qué es bcrypt y qué es el *cost factor* · qué es un JWT (partes, firma, qué no protege) · cookie `httpOnly`, `Secure`, `SameSite` · XSS vs. CSRF · qué es un ataque de enumeración · qué es un ataque de temporización (*timing attack*) · fuerza bruta y rate limiting · qué es una inyección (HTML, CSV) · firma de webhooks (HMAC).
**Evidencia**: `auth/*`, `admin/service.ts` (login admin) · `shared/{jwt,cookies,auth-middleware,rate-limit}.ts` · `webhooks/service.ts` · `shared/email/html.ts` · ADR-011, 013, 022, 024, 026, 028.

| Tarea | Subtareas |
|---|---|
| **K5.1 Modelo de identidad** | Invitación previa + código de 6 dígitos (nunca anónimo); el código se guarda **hasheado**; por qué "reenviar" genera uno nuevo (ADR-026); expiración al terminar el evento (ADR-011, ADR-029). |
| **K5.2 Sesión** [T] | Login → JWT firmado → cookie `httpOnly` → `requireClienteAuth`/`requireAdminAuth`. Discriminador de rol en el token. Por qué la cookie es la única autoridad y `sessionStorage` en la web es solo comodidad de UI. |
| **K5.3 Rate limiting** [P][F] | 5 intentos / 15 min **por email, nunca por IP** (ADR-022) y por qué; `scope` cliente/admin (lockout cruzado evitado, migración 0011); ADR-028 (código correcto + evento terminado no cuenta). Predecir el resultado de la sexta petición. [F] Quitar el `scope` y demostrar el lockout cruzado. |
| **K5.4 No-enumeration y temporización** | Mensaje genérico idéntico en los tres fallos. **Pero**: `loginCliente` (`auth/service.ts` líneas 51-54 vs 56) y `loginAdmin` (`admin/service.ts`, mismo patrón `if (!admin) … throw` antes del `bcrypt.compare`) salen sin comparar el hash cuando el email no existe → la latencia delata si el email tiene invitación/cuenta (**H-015**, verificado por lectura en ambos). *(Decisión del líder, 2026-09-21: se enseña como hallazgo vivo; no se corrige antes de empezar.)* |
| **K5.5 Entrada hostil** | a. Escape de HTML en correos (`escaparHtml` como único punto de escape). · b. CSV injection (`csvEscapar`: `=+-@`, tab, CR). · c. Zod en toda frontera. · d. CORS con origen exacto + `credentials`. · e. Verificación de firma Svix del webhook y por qué se necesita el body crudo. |
| **K5.6 Secretos** | Qué es secreto (`JWT_SECRET`, `RESEND_*`, `ADMIN_PASSWORD`), dónde vive cada uno (local, Render), y la regla "nunca hardcodear". |

**Simulacro K5** — **B** ¿Por qué el código se guarda hasheado y no cifrado? ★ · **B** ¿Qué protege `httpOnly` y qué **no**? ★ · **M** ¿Por qué el rate limit es por email y no por IP? (ADR-022) ★ · **M** ¿Qué es la enumeración de usuarios y cómo la evita el login? · **M** ¿Por qué un código de 6 dígitos alcanza aquí y no alcanzaría para una cuenta bancaria? · **D** Encuentra la fuga de temporización en `loginCliente`: ¿cómo la explotarías y cómo la arreglarías? ★ · **D** El rate limiting hace `SELECT COUNT` y luego `INSERT`: ¿qué pasa con 50 peticiones simultáneas? (H-002) · **D** ¿Qué vector de ataque abre `sessionStorage` si guarda el email de sesión?
**Puertas de salida**: [ ] mapa de amenazas propio (activo → amenaza → defensa → hueco) · [ ] H-015 y H-002 explicados · [ ] demo del lockout.

---

### K6 — Concurrencia y transacciones (4 bloques) — el gate central

**Objetivo**: explicar por qué el cupo nunca se sobrevende, demostrarlo y saber exactamente qué bugs previnieron cada `FOR UPDATE` y cada `UPDATE … WHERE`. Es lo que más diferencia esta entrevista.
**Fundamentos previos (bloque completo, desde cero)**: qué es una transacción y las propiedades ACID · nivel de aislamiento `READ COMMITTED` (el de Postgres por defecto) y qué anomalías permite · qué es una condición de carrera · lectura-modificación-escritura con hueco (*read-then-write*) y por qué falla · bloqueos de fila (`SELECT … FOR UPDATE`) · `UPDATE` condicional como operación atómica · qué es un *deadlock* y cómo se evita ordenando los locks · TOCTOU (time-of-check/time-of-use).
**Evidencia**: `registration/service.ts` (584 líneas: `confirmarAsistencia`, `editarConfirmacion`, `cancelarConfirmacion`) · `slots/service.ts` (`actualizarSlot` por delta) · `shared/db-transaction.ts` · tests `registration.integration.test.ts` (cupo atómico concurrente), `edicion.integration.test.ts` (deadlock A↔B, dos PATCH concurrentes) · ADR-009, 010, 011, 029 · `spec/todo.md` entradas de Gate 3 y Gate 4.

| Tarea | Subtareas |
|---|---|
| **K6.1 El problema** [P] | Dos clientes, un cupo. Escribir en papel **qué pasa** con un `SELECT` seguido de `UPDATE`, paso a paso, con dos transacciones intercaladas. Predecir el valor final de `cupos_disponibles`. |
| **K6.2 La solución** [T] | `UPDATE slots SET cupos_disponibles = cupos_disponibles - 1 WHERE idslot = $1 AND cupos_disponibles > 0 AND activo = true` (`registration/service.ts:223`, en `confirmarAsistencia`) dentro de la **misma** transacción que la confirmación; `rowCount === 0` ⇒ `ROLLBACK` completo ⇒ 400. Por qué Postgres serializa esa fila sin que el código lo pida. El `CHECK >= 0` como red de seguridad, no como mecanismo. **Asimetría a notar**: el `UPDATE` equivalente del cambio de slot en `editarConfirmacion` (`:401`) exige `cupos_disponibles > 0` pero **no** `activo = true` (**H-020**). |
| **K6.3 Test de concurrencia real** [F] | Leer el test (`Promise.all` de dos POST, slot con `cupo_maximo = 1`, exactamente un 201 y un 400). **Falsificar**: reemplazar el `UPDATE` por `SELECT` + espera artificial + `UPDATE` incondicional y ver que el test falla con el `CHECK`. Entender por qué un test *secuencial* habría pasado igual. |
| **K6.4 Cambio de slot y deadlock** [F] | Lock de ambas filas en orden ascendente por id (`ORDER BY idslot ASC FOR UPDATE`). Escenario A→B y B→A simultáneos. **Falsificar**: quitar el orden + delay de 300 ms y ver `40P01 deadlock detected`. |
| **K6.5 El patrón que se corrigió tres veces** | *Decidir sobre una lectura tomada antes de abrir la transacción.* Recorrer el caso de los dos PATCH concurrentes (cupo fantasma) y por qué la fila se **re-lee bajo `FOR UPDATE`** dentro de la transacción. |
| **K6.6 Reconfirmar y cancelar** | HU-6/HU-7: liberar cupo al cancelar, reutilizar la fila (`UNIQUE(idinvitacion)`), qué pasa con dos reconfirmaciones simultáneas. |
| **K6.7 Cupo por delta (admin)** | `actualizarSlot`: `cupos_disponibles + (nuevo − viejo)` con `WHERE nuevo >= reservas`; por qué no se calcula en JS. |
| **K6.8 Lo que sigue abierto** | Hallazgos H-002 (check-then-act del rate limit), H-003 (`ROLLBACK` que enmascara), H-004 (snapshot escrito 3 veces a mano), H-020 (cambio de slot sin `activo = true` en el `UPDATE`): explicar el riesgo de cada uno **sin arreglarlo**. Para H-020, dibujar el intercalado exacto en el que un admin desactiva el slot destino entre la lectura y el `UPDATE`. *(Decisión del líder, 2026-09-21: se enseña como hallazgo vivo; no se corrige antes de empezar.)* |

**Simulacro K6** — **B** ¿Qué es una condición de carrera? Ejemplo del proyecto. ★ · **B** ¿Qué garantiza una transacción? ★ · **M** ¿Por qué el `UPDATE` condicional es atómico y un `SELECT` + `UPDATE` no? ★ · **M** ¿Para qué sirve el `CHECK (cupos_disponibles >= 0)` si ya hay un `UPDATE` condicional? · **M** ¿Qué es un deadlock y cómo lo evita el orden ascendente de ids? ★ · **D** Dibuja el intercalado exacto que produciría un cupo fantasma en `editarConfirmacion` si se decidiera sobre la lectura previa. ★ · **D** ¿Qué nivel de aislamiento usa Postgres por defecto y por qué no fue necesario `SERIALIZABLE`? · **D** ¿Cómo escalaría esto con mil slots y diez mil clientes simultáneos? ¿Qué se rompe primero? · **D** ¿Por qué el test de concurrencia se "falsificó" antes de confiar en él?
**Puertas de salida**: [ ] los dos experimentos vistos fallar (concurrencia y deadlock) · [ ] intercalado dibujado a mano · [ ] pregunta ★ del cupo fantasma respondida sin mirar.

---

### K7 — Flujos de negocio del cliente: HU-2 a HU-7 (3 bloques)

**Objetivo**: recorrer cada historia de usuario de punta a punta (pantalla → API → SQL → correo) y explicar sus reglas y bordes.
**Fundamentos previos**: qué es un plazo (*deadline*) y cómo se evalúa con fechas y zonas horarias · qué es un recibo/snapshot · idempotencia.
**Evidencia**: `registration/{routes,controller,service,deadline}.ts` · `auth/*` · `apps/web/src/{auth,registration}/**` · tests `registration.integration`, `edicion.integration`, `deadline.test.ts`, `ConfirmarPage.test.tsx`, `EditarPage.test.tsx` · ADR-006, 009, 010, 011, 028, 029 · HU-2…HU-7.

| Tarea | Subtareas |
|---|---|
| **K7.1 HU-2 Login del cliente** [T] | Formulario → `POST /auth/login` → verificación → cookie → decidir destino (`/confirmar` vs `/editar`) consultando `GET /confirmaciones/mia`. |
| **K7.2 HU-3 Confirmar** [T][P] | Trazar el caso completo: selección → preview local → `POST /confirmaciones` → dedupe de ítems → recálculo en servidor → snapshot → toma de cupo → notificación → correo. Predecir qué cambia en **cada tabla**. |
| **K7.3 HU-4/HU-5 Editar y cambiar de slot** [T] | Plazo (ADR-010) evaluado contra el slot **vigente antes del cambio**; libera + toma cupo; rollback limpio si el destino está lleno (el cliente conserva su slot). Test de 1 segundo antes/después del corte. |
| **K7.4 HU-6/HU-7 Cancelar y reconfirmar** [T] | Libera cupo, no borra la fila; reconfirmar sobre la misma fila. |
| **K7.5 Expiración del código** | Solo cuando termina el evento completo (`MAX(fecha_hora_fin)`), y la extensión de ADR-029 para slots inactivos con reservas. |
| **K7.6 Regla de negocio discutible** | Cambiar a un slot cercano con plazo ya vencido: el servidor lo acepta (decisión del líder, H-007). Ser capaz de defender **y** de criticar la decisión. |
| **K7.7 Errores y estados vacíos** | Qué ve el cliente en cada fallo (cupo agotado, plazo cerrado, sesión expirada, 409 al confirmar dos veces). |

**Simulacro K7** — **B** Narra la confirmación de punta a punta en 2 minutos. ★ · **B** ¿Qué pasa si confirmo dos veces desde dos pestañas? ★ · **M** ¿Por qué el plazo se evalúa contra el slot anterior y no el nuevo? (ADR-010) · **M** ¿Qué se guarda en el snapshot y por qué? · **M** ¿Qué pasa con mi cupo si cancelo? ¿Y si reconfirmo? · **D** Tienes un slot con 1 cupo y un cliente que cambia a él mientras otro confirma: ¿quién gana y qué ve el perdedor? · **D** ¿Qué defenderías y qué cambiarías de la regla de cambio con plazo vencido? · **D** ¿Cómo garantizas que el correo dice exactamente lo que quedó guardado?
**Puertas de salida**: [ ] traza de HU-3 con las tablas afectadas · [ ] los cinco escenarios de borde explicados.

---

### K8 — Admin panel: HU-1 y HU-8 a HU-12 (2 bloques)

**Objetivo**: dominar lo que ventas hace y las reglas que protegen esos flujos.
**Evidencia**: `admin/{routes,controller,service}.ts` · `catalog/service.ts` · `slots/service.ts` · `apps/web/src/admin/**` · tests `admin.integration`, `catalog.integration`, `slots.integration`, páginas `*Admin*.test.tsx` · ADR-007, 013, 023, 024, 026, 027, 030.

| Tarea | Subtareas |
|---|---|
| **K8.1 HU-1 Invitar / HU-11 Reenviar** | Generar código (`randomInt`), hashear, guardar, notificar. Por qué reenviar **no recupera** el código (ADR-026) y que además limpia el rate limit del cliente. |
| **K8.2 HU-8 Listado y CSV** [T][P] | Invitación-céntrico (`FROM invitaciones LEFT JOIN confirmaciones`), **5 estados** que nunca se agrupan (ADR-024/030) y su precedencia; snapshot congelado; una sola columna `nombre` (ADR-027); `csvEscapar`; por qué el CSV no lleva separador de miles. Predecir el estado de 6 invitaciones de ejemplo. |
| **K8.3 HU-9/HU-10 CRUD y soft-delete** | Reactivar con `PATCH activo:true`; reducir `cupoMaximo` por debajo de las reservas se rechaza. |
| **K8.4 HU-12 Umbrales** | Coherencia 5 % ≥ 3 % validada en el **schema compartido** (`superRefine`) y otra vez en el servidor; el `CHECK` de Postgres como última línea. |
| **K8.5 Filtro en JS** | `listarConfirmacionesAdmin` filtra por estado en memoria (H-010): por qué es aceptable hoy y cuándo dejaría de serlo. |

**Simulacro K8** — **B** ¿Por qué el listado parte de `invitaciones` y no de `confirmaciones`? ★ · **M** ¿Qué distingue "Sin respuesta", "Rebotada" y "Fallida"? ★ · **M** ¿Por qué reenviar genera un código nuevo? · **M** ¿Qué pasa si desactivo un slot con clientes confirmados? · **D** Un valor de nombre `=HYPERLINK(...)` llega al CSV: ¿qué pasa y cómo se evita? · **D** ¿Dónde se valida la coherencia de umbrales y por qué en tres lugares?
**Puertas de salida**: [ ] predicción de los 5 estados correcta · [ ] CSV injection explicada.

---

### K9 — Notificaciones y correo: Resend, webhook, plantillas (2 bloques)

**Objetivo**: entender el ciclo de vida de un correo y sus modos de fallo.
**Fundamentos previos**: qué es SMTP vs. API de correo · qué es un webhook y por qué necesita firma · qué es idempotencia · zona horaria en fechas de un correo · qué es HTML compatible con clientes de correo (tablas, estilos en línea).
**Evidencia**: `shared/{mailer,notificaciones}.ts` · `shared/email/{documento,envio,fechas,html,plantillas}.ts` · `webhooks/*` · tests `mailer.test`, `envio.test`, `plantillas.test`, `webhooks.integration` · ADR-024, 030.

| Tarea | Subtareas |
|---|---|
| **K9.1 Ciclo de vida** [T] | Se crea la fila `notificaciones` (`pendiente`) **dentro** de la transacción → COMMIT → se envía → `enviado`/`fallido` → el webhook actualiza a `rebotado` (o confirma). Por qué el envío va **después** del COMMIT. |
| **K9.2 Fallos posibles** | Envío fallido, plantilla que lanza, base caída tras el COMMIT (H-005), webhook que llega antes de guardar `id_mensaje_resend` (H-001), dominio sin verificar (H-012). |
| **K9.3 Plantillas** | Modelo de bloques → dos renderers (HTML y texto), `escaparHtml`, fechas fijas en `America/Guatemala`, el código de acceso **solo** en invitación/reenvío. |
| **K9.4 Webhook de Resend** [T][F] | Body crudo, firma Svix, mapeo `email.delivered/bounced/failed`, estados terminales que no se pisan. [F] Alterar un byte del cuerpo y ver el rechazo. |
| **K9.5 El guard `NODE_ENV=test`** | Por qué existe y el riesgo que abre en producción (H-006). |

**Simulacro K9** — **B** ¿Por qué el correo se envía después del COMMIT? ★ · **M** ¿Qué es la firma Svix y qué ataque evita? ★ · **M** ¿Por qué `rebotado` y `fallido` son estados distintos? · **D** Si Resend confirma la entrega antes de que guardes su id, ¿qué se pierde? (H-001) · **D** ¿Qué haría falta para reintentar envíos fallidos? · **D** ¿Cómo garantizas que un nombre con `<script>` no rompe el correo?
**Puertas de salida**: [ ] diagrama de estados de `estado_envio` · [ ] H-001 y H-005 explicados.

---

### K10 — Frontend: React, TanStack Query, formularios y UI (4 bloques, partido en K10a–d)

**Distribución en bloques** (ver "Gates partidos", sección 3): **K10a** (D4) fundamentos desde cero + K10.1 · **K10b** (D5B4, tras K5) K10.2 + K10.3 + K10.6 · **K10c** (D7B4, tras K7) K10.4 + K10.7 + K10.8 · **K10d** (D9B1) K10.5 + **simulacro K10**.

**Objetivo**: explicar cómo está organizada la web, por qué cada librería está ahí y cómo se comporta ante fallos.
**Fundamentos previos (bloque completo, desde cero)**: componentes y JSX · estado y *hooks* (`useState`, `useEffect`, `useMemo`) · renderizado y re-renderizado · qué es *server state* vs. estado de UI · qué es una caché de consultas (claves, `staleTime`, invalidación) · formularios controlados vs. no controlados · `cloneElement` · ARIA y accesibilidad básica (label, `aria-describedby`, `aria-invalid`, `role="alert"`, foco visible, contraste) · qué es Tailwind y qué es un token de diseño.
**Evidencia**: `apps/web/src/**` · `main.tsx`, `App.tsx` · `shared/api/client.ts` · `shared/ui/*` · `index.css` · páginas y componentes de `registration/`, `auth/`, `admin/` · tests de web · ADR-012, 016, 017.

| Tarea | Subtareas |
|---|---|
| **K10.1 Estructura y arranque** | Feature-first (`auth`, `registration`, `admin`, `shared`); providers (`QueryClient`, contextos de sesión, router); las 9 rutas de `App.tsx`. |
| **K10.2 La capa de red** [T] | `apiFetch` (lee `error` solo si es string, traduce fallos de red, `AbortError`) y `ApiError`. Cómo cada hook `use*` envuelve una llamada y **parsea la respuesta con el schema compartido**. |
| **K10.3 TanStack Query** [P] | Claves de query, `staleTime: 0` (valor por defecto), invalidación tras cada mutación (`["admin","catalogo"]`, `["admin","slots"]`, `["admin","invitaciones"]`, `["confirmacion-propia"]`…). Por qué `useEditarConfirmacion`/`useCancelarConfirmacion` invalidan `confirmacion-propia` aunque hoy sea inofensivo. Predecir qué se ve tras editar y volver atrás. |
| **K10.4 Formularios** [T] | `react-hook-form` + `zodResolver` con el **mismo** schema que valida el API; `setValueAs` para campos vacíos; `Field` con `cloneElement` para inyectar `id`, `aria-invalid`, `aria-describedby`; el bug de `MoneyController` (Controller como hijo). |
| **K10.5 Pantallas del cliente** | `ConfirmarPage`/`EditarPage`: preview de descuento (misma función que el servidor), `CajaSeleccionados`, `ReciboConfirmacion`, `ExplicacionDescuento`; por qué el preview nunca es autoritativo. |
| **K10.6 Sesión y 401** | Contextos de sesión (`sessionStorage`), redirección por 401 y por sesión ausente. Hoy solo `ConfirmarPage`, `EditarPage` e `InvitacionesPage` reaccionan al 401; las otras cuatro pantallas admin (catálogo, slots, confirmaciones, umbrales) no (**H-021**). La duplicación entre `AdminSessionContext` y `ClienteSessionContext` (**H-019**). |
| **K10.7 UI, Tailwind y accesibilidad** | Tokens en `index.css`, `shared/ui`, contraste AA con luminancia relativa real, `:focus-visible`, decisión del botón "Agregar" con `aria-label` (WCAG 2.5.3). |
| **K10.8 Input de dinero** [F] | `MoneyInput`/`money-input.ts`: formato en vivo, cursor, centavos enteros. [F] Reemplazar el parseo entero por `parseFloat × 100` y ver qué caso de `money-input.test.ts` falla. |

**Simulacro K10** — **B** ¿Qué es el estado de servidor y por qué TanStack Query y no `useEffect` + `useState`? ★ · **B** ¿Por qué el mismo schema Zod valida el formulario y el API? ★ · **M** ¿Qué es `staleTime` y qué pasa con `staleTime: 0`? · **M** ¿Cómo se asocia un mensaje de error a su input y por qué importa? · **M** ¿Por qué el preview de descuento no puede confiarse? · **D** Explica `Field` y su `cloneElement`: ¿qué se rompe con un `Controller` como hijo y cómo se resolvió? · **D** Dos pestañas abiertas: una confirma, la otra intenta confirmar. ¿Qué ve el usuario y por qué? · **D** ¿Qué harías para que el sistema de sesión de la web no dependa de `sessionStorage`?
**Puertas de salida**: [ ] árbol de componentes de `ConfirmarPage` dibujado · [ ] flujo de datos formulario→API explicado · [ ] los 3 problemas de accesibilidad corregidos en Gate 6 enumerados.

---

### K11 — Estrategia de pruebas (1 bloque)

**Objetivo**: leer los tests como especificación y defender lo que se decidió (y no se decidió) probar.
**Fundamentos previos**: pirámide de pruebas · prueba unitaria vs. integración vs. contrato · qué es un *mock* y cuándo engaña · qué es una fixture.
**Evidencia**: `vitest.config.*` · `apps/api/src/test-support/fixtures.ts` · `apps/web/src/test-support/renderWithProviders.tsx` · ADR-017, 018 · `tasks/lessons.md`.

| Tarea | Subtareas |
|---|---|
| **K11.1 Mapa de cobertura** | Tabla: cada regla de negocio crítica → el test que la protege (fronteras de ADR-005, cupo atómico, deadlock, plazo ±1 s, rate limit, snapshot, soft-delete, webhook terminal, CSV injection). Detectar reglas **sin** test. |
| **K11.2 Por qué DB real** | ADR-017: nada de mocks para lo transaccional; `fileParallelism: false`; `TRUNCATE` entre tests. |
| **K11.3 Falsificación como método** | Repasar qué tests se falsificaron y cómo, y por qué "verde" no basta. |
| **K11.4 Qué no está probado** | Sin e2e de UI (riesgo asumido), verificación visual manual del líder, teclado móvil/IME. |

**Simulacro K11** — **B** ¿Por qué los tests de API usan Postgres real? ★ · **M** ¿Qué es un test que "pasa por la razón equivocada"? Ejemplo del proyecto. ★ · **D** Dame la regla de negocio más riesgosa **sin** test y cómo la cubrirías.
**Puertas de salida**: [ ] mapa regla→test propio · [ ] al menos 3 reglas sin cobertura anotadas en hallazgos.

---

### K12 — Infraestructura, Docker, despliegue y CI/CD (3 bloques, partido en K12a–c) — carriles Docker y CI/CD del panel

**Distribución en bloques** (ver "Gates partidos", sección 3): **K12a** (D4B3) K12.1 · **K12b** (D4B4) K12.2, K12.3, K12.6 y K12.7 **a, b, d, e** · **K12c** (D9B3, **después de K11**) K12.4, K12.5, K12.7 **c, f** + **simulacro K12**. Solo K12.7 c y f dependen de K11 (service container, variables y orden de build de los tests de integración); las subtareas a, b, d, e de K12.7 no, y por eso el carril CI/CD tiene contenido formal desde D4.

**Objetivo**: llevar la app de tu máquina a producción, operarla y diagnosticarla, y poder responder a un especialista en Docker y a uno en CI/CD **sin bajar la mirada** ante el hecho de que hoy no hay pipeline (H-022).
**Fundamentos previos**: qué es un contenedor y una imagen · capas y caché de Docker · Dockerfile multi-stage · qué es un Blueprint (`render.yaml`) · plan gratuito (dormir, expiración de la DB) · DNS, SPF/DKIM (para el dominio de correo) · logs · qué es integración continua, un *runner*, un *service container*, protección de rama, entrega vs. despliegue continuo.
**Evidencia**: `apps/api/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.yml`, `render.yaml`, `.env.example`, `apps/web/.env.production` · ADR-014/015 · `tasks/lessons.md` · `README.md` (Demo pública).

| Tarea | Subtareas |
|---|---|
| **K12.1 Imágenes y compose (nivel especialista)** [T][P] | a. Por qué multi-stage y qué contiene cada etapa. · b. `npm ci` instala **devDependencies** en el builder (¿qué se rompe si se omiten? `tsc` y `vite` no existen) y el runner recibe **el `node_modules` completo, devDependencies incluidas** (`apps/api/Dockerfile:22-25`, sin `npm prune`; **H-027**: la versión anterior de este plan decía "copia solo lo necesario", y era falso). · c. Contexto de build = **raíz del monorepo** (necesita `packages/shared-types` y el lockfile) y qué pasa si se apunta a `apps/api`. · d. Orden de capas y caché: por qué se copian los `package.json` antes del código. · e. Migraciones en el `CMD` (`node dist/db/migrate.js && node dist/index.js`) pero **no** el seed; **qué pasa si una migración falla al arrancar** (el contenedor no levanta, Render reintenta, el servicio anterior sigue sirviendo). · f. `NODE_ENV=production` fijado en el Dockerfile incluso en compose local, y por qué eso obliga a que `COOKIE_SECURE` sea una variable propia. · g. `healthCheckPath` y por qué `/health` no prueba la DB. · h. Tamaño de imagen y qué se podría recortar. · i. Predecir antes de `docker compose up --build`: orden de arranque, `depends_on` con `service_healthy`. |
| **K12.2 `render.yaml`** | Servicios, base gestionada, variables `sync: false` (secretos que se setean a mano) vs. valores fijos, `healthCheckPath`. |
| **K12.3 Matriz de variables** | Cada variable: quién la lee, dónde se define en local y en Render, qué pasa si falta (`FRONTEND_URL` → la app no arranca). |
| **K12.4 Producción real** [T] | Abrir la demo pública y la API: `/health`, login admin, invitar, correo entrante, registro del webhook en Resend. Verificar lo que dice el README contra lo que hay (H-012, H-014). **⚠ Cuidado con el rate limit (regla 8 de la sección 0)**: el camino de éxito del login admin se prueba **una** vez con la cuenta real; los caminos de fallo, **solo con un email inventado**. Cada intento fallido persiste una fila y 5 en 15 minutos bloquean esa cuenta: equivocarse de contraseña real varias veces deja **a ventas sin acceso 15 minutos**. Un intento fallido contra `nadie@example.com` ya se hizo el 2026-09-21 (H-014); no hace falta repetirlo. |
| **K12.5 Runbook de incidentes reales** | Los que ya ocurrieron: `DATABASE_URL` ausente ⇒ 500 con `/health` en verde; `tsx watch` no relee `.env`; Docker caído ⇒ `ECONNREFUSED`; remitente sandbox que solo entrega a la cuenta; "Invalid UUID" por mensajes de Zod. Para cada uno: síntoma, causa, cómo se descubre en 5 minutos. |
| **K12.6 Costos y límites del free tier** | Cold start de 30–60 s, la DB gratuita expira, correo sin dominio propio; qué cambiaría en un despliegue real. |
| **K12.7 CI/CD: la respuesta honesta y el pipeline que escribirías** | a. **Estado real**: no existe `.github/`; la disciplina de gates (tests → `/code-review` → `advisor` → walkthrough) y los dos hooks locales existen, pero **nada lo hace cumplir** (H-022). Decirlo sin rodeos y sin excusas. · b. **El costo concreto de no tenerlo es H-025**: tres arreglos escritos y probados que nunca llegaron al historial y se perdieron; es evidencia, no una anécdota. · c. **El pipeline que escribirías**, por escrito y sin implementarlo: disparadores (`pull_request` y push a `master`); un job con Postgres 16 como *service container* y `healthcheck`; `npm ci`; **orden de build** (`shared-types` primero, porque api y web consumen su `dist/`); las variables que necesitan los tests de integración (`DATABASE_URL` apuntando a la base de test, `FRONTEND_URL`, `JWT_SECRET`, `RESEND_WEBHOOK_SECRET`); `test:db:setup` y `db:migrate` antes de `npm run test`; caché de npm; **protección de rama** (checks obligatorios). · d. Despliegue: Render con auto-deploy desde `master` vs. despliegue manual, y qué riesgo tiene que una rama sin CI despliegue sola. · e. Qué **no** pondrías en el pipeline de entrada (e2e de UI: ADR-017). · f. Migraciones en el pipeline: probar que corren sobre una base vacía **y** sobre la anterior. |

**Simulacro K12** — **B** ¿Qué hace cada Dockerfile y por qué son multi-stage? ★ · **B** ¿Qué pasa al arrancar el contenedor de la API? · **M** ¿Por qué `/health` no basta como chequeo? ★ · **M** ¿Qué variables son secretas y dónde se guardan? · **M** ¿Qué llega realmente al runner y qué no, y por qué quitar las devDependencies rompería hoy el procedimiento del seed? (H-027) · **D** Producción devuelve 500 en todo menos en `/health`: ¿qué miras y en qué orden? · **D** Una migración falla al arrancar el contenedor: ¿qué ve el usuario, qué hace Render y cómo lo detectas? · **D** ¿Qué agregarías para un despliegue de verdad (backups, observabilidad, migraciones sin downtime)? · **D** *(CI/CD)* Hoy no hay pipeline: ¿qué te costó eso, con un ejemplo real, y qué escribirías primero? ★ · **D** *(CI/CD)* ¿Qué necesita un test de integración con Postgres real para correr en un runner efímero? ★
**Puertas de salida**: [ ] producción verificada por el alumno · [ ] runbook propio de 5 incidentes · [ ] pipeline de CI **escrito en papel** (K12.7c) y defendido · [ ] H-025 contada como evidencia.

---

### Colchón (1 bloque)

Repetir solo lo fallado en los simulacros anteriores; releer los hallazgos abiertos.

---

### K13 — Capstone: defensa ante el panel multidisciplinario (4 bloques)

**H-012: RESUELTO el 2026-09-21** — el líder confirmó que el dominio de correo es propio, está verificado, probado y funcional (dato suyo; el alumno debe poder decir "el correo sale de un dominio verificado" y saber que el desfase estaba solo en `ESTADO_PLAN.md`). **La respuesta a "¿puedo usarlo el lunes?" ya no depende de ese dato**; los límites honestos que quedan son H-011 (teléfono de ventas ficticio) y el catálogo de ejemplo. *Texto original del prerrequisito, conservado como historial:* **Prerrequisito duro — H-012 resuelto antes de K13**: la pregunta más probable del project owner es "¿puedo usarlo el lunes?" y su respuesta honesta depende de un solo dato que hoy se contradice entre documentos: si `RESEND_FROM_EMAIL` es un **dominio verificado** o el **sandbox `onboarding@resend.dev`** (que solo entrega al correo de la cuenta de Resend y hace imposible invitar a terceros). `ESTADO_PLAN.md` §5 dice sandbox; el `README` dice `@cscompanyserv.com`. Es una comprobación de **dos minutos en el dashboard de Resend, que solo puede hacer el líder** (Resend → Domains). Si es sandbox, la respuesta correcta es "no, hoy no se puede invitar a un tercero", y el alumno debe darla; si dice otra cosa, lo va a desmentir el único entrevistador que lo pruebe. **No bloquea K0; sí bloquea K13.**

**Objetivo**: demostrar dominio bajo presión ante el formato real que confirmó el líder: **cinco especialistas** (Docker, frontend, backend, CI/CD, project owner), en español, sin live coding. Un panel **no** son cinco entrevistas seguidas: su rasgo definitorio es la **repregunta cruzada**, donde la respuesta a un especialista pasa a otro que la ataca desde su ángulo. El mentor interpreta a los cinco.

**Qué pregunta cada especialista** (guion del mentor):

| Carril | Foco de sus preguntas | Anécdota de fallo que el alumno debe poder contar **como descubrimiento** |
|---|---|---|
| **Backend** | Cupo atómico, transacciones, deadlock, snapshots, rate limiting, autenticación, H-015/H-020/H-002 | El cupo fantasma (decidir sobre una lectura previa a la transacción), corregido tres veces. |
| **Frontend** | TanStack Query, `react-hook-form` + Zod, `Field`, accesibilidad, preview de descuento, sesión y 401 | `Field` con `cloneElement` perdiendo `id`/`aria-*` bajo un `Controller` (`MoneyController`). |
| **Docker** | Multi-stage, capas, contexto de build, migraciones al arrancar, `NODE_ENV`, healthcheck, variables | `DATABASE_URL` ausente ⇒ 500 en todo con `/health` en verde. |
| **CI/CD** | Qué automatiza y qué no, el pipeline que escribiría, protección de rama, despliegue | **H-025**: tres arreglos probados que nunca llegaron al historial. |
| **Project owner** | ¿Construiste lo que pedía el PDF? ¿qué recortaste? ¿puedo usarlo el lunes? Riesgos: H-011 (teléfono ficticio), H-012 (dominio de correo), catálogo de ejemplo, "verificado visualmente por el líder, no automáticamente" (ADR-017) | ADR-027: el `apellidos` que el modelo de datos nunca tuvo. |

| Bloque | Qué pasa | Qué se evalúa |
|---|---|---|
| **K13.1** | **Ronda de apertura, un especialista tras otro** (~18 min cada uno, en su carril) | Profundidad por especialidad y vocabulario exacto (Apéndice B: los términos de Docker y CI/CD son nombres de herramientas en inglés aunque la entrevista sea en español). Pitch v2 al inicio, comparado con el v1 de K0.5. |
| **K13.2** | **Segunda vuelta por carril + anécdota de fallo** de cada uno | Que cada anécdota se cuente como **descubrimiento** (qué falló, cómo se detectó, qué se cambió), no como confesión ni como excusa. |
| **K13.3** | **Ronda de repreguntas cruzadas** — **al menos dos veces** la respuesta pasa a otro especialista. Cadena canónica a guionar: *frontend* pregunta por el preview de descuento en vivo → *backend* repregunta por la autoridad del servidor (ADR-025, "el cliente nunca es autoritativo") → el *project owner* pregunta qué número ve realmente el cliente en el recibo y cuándo puede cambiar. Además, **defensa de la tabla de trazabilidad** (ver abajo). | Que no se contradiga entre carriles y que pueda **conectar** decisiones técnicas con requisitos de negocio. |
| **K13.4** | **Bug hunt en vivo** (fragmento real con el fix quitado), **preguntas mezcladas del banco de la sección 5** sin aviso de tema, **retrospectiva** (qué está flojo, qué harías distinto, qué aprendiste del proceso de trabajo con un asistente de IA y cómo controlaste su calidad —pregunta 25) y **diagnóstico final vs. línea base, pregunta por pregunta** | Dominio integral y honestidad sobre las debilidades reales (los hallazgos abiertos). |

**Entregables**: pitch v2, diagnóstico final, **tabla de trazabilidad completa**, **lista priorizada de mejoras** (salida de `ONBOARDING_HALLAZGOS.md`, lista para convertirse en una futura fase de desarrollo) y **guía personal de estudio posterior**.
**Aprobación de la fase**: promedio ≥ 2,3 en el simulacro integral (K13.3 y K13.4 juntos) **y** ningún 0 ni 1 en las preguntas ★ que el mentor plantee en las rondas de K13. Para que sea aplicable, **el mentor elige esas ★ del banco de la sección 5 garantizando al menos dos por carril** (backend, frontend, Docker, CI/CD, project owner); los ★ de los simulacros K0–K11 califican **cada gate**, no la fase.

---

## 5. Banco de 29 preguntas probables para el panel (Docker, frontend, backend, CI/CD y project owner)

Con el gate que las cubre. Las 1–25 son las generales; **las 26–29 se agregaron para el panel** (el banco original se pensó para un entrevistador genérico y no tenía ninguna pregunta de CI/CD). Se usan de *warm-up* en K13. **★ = crítica.**

1. Explícame la arquitectura en un dibujo. (K1)
2. ¿Por qué monorepo y por qué un paquete de tipos compartido? (K1, K3)
3. ¿Cómo garantizas que dos clientes no reserven el último cupo? (K6) ★
4. ¿Qué es un deadlock y dónde podría ocurrir aquí? (K6)
5. ¿Cómo autentica el sistema a un cliente? ¿Y a un admin? (K5) ★
6. ¿Por qué el código se guarda hasheado y por qué expira? (K5)
7. ¿Cómo evitas la fuerza bruta? ¿Por qué por email y no por IP? (K5)
8. ¿Qué vulnerabilidades tiene tu sistema hoy? (K5, hallazgos) ★
9. ¿Cómo manejas el dinero y por qué enteros? (K3) ★
10. Explícame el motor de descuento y cómo agregarías una regla. (K3)
11. ¿Por qué el descuento se calcula en cliente y servidor? (K3, K10)
12. ¿Qué es un snapshot y por qué no recalculas? (K2)
13. ¿Qué pasa si el correo falla? ¿Y si Resend rebota? (K9)
14. ¿Cómo verificas la autenticidad del webhook? (K5, K9)
15. ¿Por qué TanStack Query y react-hook-form? (K10)
16. ¿Cómo validas: dónde y con qué? ¿Por qué también la respuesta? (K3, K4)
17. ¿Cómo probaste la concurrencia? ¿Cómo sabes que el test prueba lo que dice? (K6, K11) ★
18. ¿Qué no probaste y por qué? (K11)
19. ¿Cómo desplegaste? ¿Qué pasa al arrancar el contenedor? (K12)
20. La app devuelve 500 en producción: ¿qué haces? (K12)
21. ¿Qué harías distinto si empezaras hoy? (todos, hallazgos) ★
22. ¿Qué decisión tomaste que luego corregiste? (K1) ★
23. ¿Cómo escala esto? ¿Qué se rompe primero? (K1, K6, K12)
24. ¿Cómo cuidaste la accesibilidad? (K10)
25. ¿Cómo trabajaste con un asistente de IA y cómo controlaste su calidad? (K1) — *pregunta cada vez más frecuente; ver la sección de proceso y la regla de cierre de gates.* **Se responde con anécdotas técnicas, en este orden**: (1) **el cupo fantasma** (decidir sobre una lectura tomada antes de abrir la transacción, el mismo error en tres funciones —`editarConfirmacion`, `cancelarConfirmacion` y la reconfirmación—, K6.5): lo encontró el `/code-review` del cierre de Gate 4, no la implementación inicial (`spec/todo.md:249-250`); (2) **el test falsificado** (un test de concurrencia solo se acepta tras quitar el fix y ver que falla, K6.3 y K11.3; "verde" no basta); (3) **`DATABASE_URL` ausente con `/health` en verde** (K0.3 y K12.5: se descubre con un request que use la DB, y quedó como lección en `tasks/lessons.md`). Hilo común: **se controla la calidad del asistente exigiendo evidencia, no confiando en su fluidez**; los mecanismos son los gates, los hooks, `/code-review`, la falsificación y el paso 7 bis de este plan. *(Registro interno, no es el arranque de la respuesta: el paso 7 bis nació de una sesión en la que el asistente atribuyó a un revisor palabras que nunca dijo; consta en la entrada del 2026-09-21 de `spec/todo.md` y en `tasks/lessons.md`.)*
26. *(CI/CD)* Hoy no hay pipeline: ¿qué te costó eso, con un ejemplo real, y qué escribirías primero? (K12.7, H-022, H-025) ★
27. *(CI/CD)* ¿Qué necesita un test de integración con Postgres real para correr en un runner efímero? (K11, K12.7) ★
28. *(Docker)* ¿Qué pasa si una migración falla al arrancar el contenedor de la API, y cómo te enteras? (K12.1)
29. *(Project owner)* ¿Construiste lo que pedía el PDF? ¿Qué recortaste o dejaste como placeholder y puedo usarlo el lunes? (K0, K8, H-011, H-012) ★

---

## 6. Cómo se usa el registro de hallazgos

Durante cada bloque, cualquier cosa que suene a "esto podría estar mejor" se anota en `ONBOARDING_HALLAZGOS.md` con: ID (`H-###`), gate donde apareció, evidencia (archivo:línea o ADR), severidad (Alta/Media/Baja), tipo (Bug · Seguridad · Concurrencia · Deuda · Doc · UX · Operación · Proceso) y una **decisión sugerida que NO se implementa**. Al cerrar K13, el registro se prioriza y se convierte en el insumo de una posible Fase 3 (desarrollo de mejoras) que el líder decide abrir o no.

Regla anti-ruido: un hallazgo debe poder verificarse leyendo el código o corriendo algo; las opiniones de estilo sin consecuencia real van a la sección "Observaciones" del registro, no a la tabla.

---

## 7. Tablero de progreso (lo actualiza el mentor al cerrar cada bloque)

| Gate | Bloques | Estado | Fecha | Simulacro (prom.) | ★ críticas OK | Hallazgos generados |
|---|---|---|---|---|---|---|
| K0 Orientación y calibración | 3 | ✅ aprobado | 2026-09-22 | 2,0 (1,8 en la primera pasada; P5 repetida) | sí | H-026, H-027, H-028, H-029 |
| K1 Arquitectura y proceso | 2 | ⬜ pendiente | — | — | — | — |
| K2 Modelo de datos y SQL | 3 | ⬜ pendiente | — | — | — | — |
| K3 Contrato y lógica pura | 3 | ⬜ pendiente | — | — | — | — |
| K4 Backend: request y capas | 2 | ⬜ pendiente | — | — | — | — |
| K5 Autenticación y seguridad | 3 | ⬜ pendiente | — | — | — | — |
| K6 Concurrencia y transacciones | 4 | ⬜ pendiente | — | — | — | — |
| K7 Flujos del cliente (HU-2…7) | 3 | ⬜ pendiente | — | — | — | — |
| K8 Admin panel (HU-1, 8…12) | 2 | ⬜ pendiente | — | — | — | — |
| K9 Notificaciones y correo | 2 | ⬜ pendiente | — | — | — | — |
| K10 Frontend (a–d) | 4 | ⬜ pendiente | — | — | — | — |
| K11 Estrategia de pruebas | 1 | ⬜ pendiente | — | — | — | — |
| K12 Infra, Docker y CI/CD (a–c) | 3 | ⬜ pendiente | — | — | — | — |
| Colchón | 1 | ⬜ | — | — | — | — |
| K13 Capstone (panel) | 4 | ⬜ pendiente | — | — | — | — |

Leyenda: ⬜ pendiente · 🟨 en curso · ✅ aprobado · 🔁 repetir parcialmente.

**Línea base del diagnóstico inicial (2026-09-21, D1, K0.1c; sin ayuda)** — preguntas con nota ≥ 2 sobre 5, y puntos sobre 15: **SQL/concurrencia 2 / 5 (5 pts)** · **Auth/seguridad 1 / 5 (3 pts)** · **React/formularios 0 / 5 (0 pts)** · **Docker/deploy 2 / 5 (5 pts)** → **13 / 60 pts, promedio 0,65**. Notas del propio mentor (sin revisor externo).

| # | Nota | Respuesta del alumno (resumida) y hueco |
|---|---|---|
| 1 | 1 | Transacción "encapsula y bloquea filas hasta que termina"; no menciona atomicidad (todo o nada) ni `ROLLBACK`. |
| 2 | 2 | Describe bien la condición de carrera: ambos leen "hay cupo" sin saber del otro y se sobrepasa. No menciona la solución. |
| 3 | 0 | "No sé". |
| 4 | 2 | `LEFT JOIN` conserva todo el lado izquierdo con `NULL` donde no hay par. No sabe la diferencia con `JOIN`. |
| 5 | 0 | "No sé". |
| 6 | 0 | "No sé". |
| 7 | 0 | "No sé". |
| 8 | 0 | "No sé". |
| 9 | 2 | Fuerza bruta; por IP se salta con bots de varias IP. No menciona el costo del límite por email (bloquear a un usuario legítimo). |
| 10 | 1 | Prepared statements = parámetros en vez de texto (correcto); definición de inyección imprecisa ("el compilador lo lee", "virus"); solo SQL. |
| 11–15 | 0 | "No sé" en las cinco. |
| 16 | 2 | Imagen = plantilla; contenedor = instancia en ejecución. |
| 17 | 2 | Variable disponible solo en el entorno; secretos en el repo dan acceso a quien lo lea. |
| 18 | 0 | "No sé". |
| 19 | 1 | Define bien CI/CD, **pero afirma que este proyecto ya corre un workflow al hacer push a `main`: es falso** (no existe `.github/`, H-022; verificado con `ls` el 2026-09-21). Concepción errónea con peso: es la pregunta ★ de CI/CD del panel (26). |
| 20 | 0 | "No sé". |

---

## Apéndice A — Autoevaluación de calibración (K0.1a): puntuar cada término 0–3

0 = nunca lo oí · 1 = lo oí, no sé explicarlo · 2 = lo explico con mis palabras · 3 = lo he usado y podría enseñarlo.

**SQL/datos**: PRIMARY/FOREIGN KEY · UNIQUE · CHECK · índice · JOIN/LEFT JOIN · GROUP BY · transacción · ACID · aislamiento READ COMMITTED · `SELECT … FOR UPDATE` · deadlock · migración · `TIMESTAMPTZ`.
**Backend/seguridad**: HTTP (métodos, códigos) · middleware · CORS · JWT · cookie httpOnly/Secure/SameSite · hash vs. cifrado · bcrypt · XSS · CSRF · rate limiting · timing attack · HMAC/firma de webhook · variable de entorno.
**Frontend**: componente/props/estado · `useEffect` · `useMemo` · re-render · server state · caché de queries · formulario controlado · schema de validación · ARIA · contraste/foco · Tailwind.
**Infra/proceso**: contenedor/imagen · Dockerfile multi-stage · docker compose · CI/CD · Blueprint · logs · webhook · SPF/DKIM · git worktree · ADR.

---

## Apéndice B — Glosario español ↔ inglés que el alumno debe usar

Condición de carrera = *race condition* · lectura-modificación-escritura = *read-modify-write* · bloqueo de fila = *row lock* · interbloqueo = *deadlock* · aislamiento = *isolation level* · idempotencia = *idempotency* · tabla singleton = *singleton table* · borrado lógico = *soft delete* · instantánea = *snapshot* · frontera = *boundary / edge case* · lista de reglas (patrón estrategia) = *strategy pattern* · abierto/cerrado = *open/closed principle* · contrato primero = *contract-first* · fuente única de verdad = *single source of truth* · enumeración de usuarios = *user enumeration* · ataque de temporización = *timing attack* · inyección = *injection*.
