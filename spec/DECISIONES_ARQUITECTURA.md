# Decisiones de Arquitectura — Plataforma de Confirmación de Asistencia (Feria de Promociones)

> Versión: 1.0 | Fecha: 2026-09-16
> Estado: ADRs 001-019 acordadas en entrevista spec-driven (7 rondas) con el líder del proyecto. Gates abiertos marcados explícitamente donde la lectura no fue ratificada con una pregunta directa.
> Origen: `Prueba_Tecnica_Disagro.pdf` — plataforma para que clientes confirmen asistencia a un evento anual de promociones, seleccionando servicios/productos de interés, con descuento automático según reglas de negocio.

---

## ADR-001 — Stack: React + Node.js + TypeScript, no Angular

**Decisión**: Se descarta el scaffold Angular inicial del repo. La plataforma se construye en React (frontend) y Node.js/TypeScript (backend).
**Por qué**: El PDF dice textualmente *"El stack permitido para la prueba es node.js, typescript y react"*. Es una lista de tres tecnologías nombradas explícitamente al mismo nivel — si el enunciado quisiera decir "cualquier framework en TypeScript" bastaría con "node.js y typescript"; el tercer término (react) es la señal operativa de framework de frontend permitido. Entregar Angular incumple una instrucción explícita del evaluador. La referencia a Tesloshop (repo Angular) se reutiliza solo como **filosofía de organización de carpetas** (feature-first, `shared/`, rutas perezosas por dominio), no como framework — esa estructura es idéntica a la arquitectura "feature-based" que React recomienda (ver ADR-002).
**Impacto**: Se elimina `angular.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `src/` Angular y las dependencias `@angular/*` como commit propio y reversible. `.claude/CLAUDE.md` se reescribe con convenciones React/Node.

---

## ADR-002 — Monorepo con workspaces, layout feature-first inspirado en Tesloshop

**Decisión**: Un solo repositorio (`npm workspaces`) con `apps/web` (React), `apps/api` (Node/TS/Express), `packages/shared-types` (tipos generados desde el contrato Zod, ver ADR-003).
**Por qué**: Decisión del líder del proyecto tras discutir el trade-off: la alternativa (repos separados para Equipo 1/Equipo 2) requeriría publicar `shared-types` como paquete externo (registro npm privado, submódulo git, o copiar/pegar tipos a mano en cada cambio de contrato) — infraestructura extra sin señal evaluativa, y exactamente el tipo de "incidencia de integración entre equipos" que el PDF pide anticipar, no crear. La separación Equipo 1/Equipo 2 se logra por convención de carpetas (`apps/web` = Equipo 1, `apps/api` = Equipo 2) y de commits (`feat(web): ...` / `feat(api): ...`), no por límite de repositorio. El PDF además pide "link de repositorio" en singular.
**Impacto**: Un `docker-compose.yml` para desarrollo local con los 3 servicios (web, api, postgres). Estructura interna de `apps/web/src` feature-first (ver mapeo Angular→React en el mensaje de entrevista, dominio `registration/`, `admin/`, `shared/`).

---

## ADR-003 — Contrato FE/BE: Zod como fuente de verdad, OpenAPI generado

**Decisión**: Los schemas Zod se escriben una sola vez en `apps/api` (validación de request/response de cada endpoint). De ahí se genera el spec OpenAPI (`zod-to-openapi`) y los tipos TypeScript compartidos en `packages/shared-types`, consumidos por `apps/web`.
**Por qué**: Alternativa considerada (OpenAPI escrito a mano como fuente, Zod aparte solo para UX de formularios) crea dos lugares que mantener sincronizados manualmente — divergen la primera vez que alguien edita uno sin el otro. Con Zod como única fuente, la validación de servidor y el contrato son literalmente el mismo artefacto — imposible que diverjan.
**Impacto**: G0 no cierra hasta que exista al menos un schema Zod end-to-end (ej. `ConfirmarAsistenciaRequest`), el OpenAPI generado, y ambas apps compilando contra `shared-types`.

---

## ADR-004 — Descuento por categoría (Servicios y Productos independientes)

**Decisión**: El % de descuento de Servicios aplica solo sobre el subtotal de servicios seleccionados; el % de Productos aplica solo sobre el subtotal de productos. No se suman en un % global.
**Por qué**: El mockup muestra dos cajas independientes ("Descuento obtenido en Servicios 3%" / "en Productos 5%"), evidencia directa de que son cálculos separados. Ratificado por el líder del proyecto, quien además pidió mejorar el mockup: en vez de una sola lista combinada, dos cajas separadas "Servicios seleccionados" / "Productos seleccionados" que se alimentan en vivo al marcar ítems, con opción de quitar, cada una mostrando su propio % de descuento (ver ADR-012 sobre cómo se filtra el catálogo hacia esas cajas).

---

## ADR-005 — Evaluación de tier (más alto gana), dinero en centavos enteros, frontera Q1,500 estricta

**Decisión**:
1. Para cada categoría se evalúa primero la condición de 5%; si no se cumple, se evalúa la de 3%. Nunca se otorga 3% a un cliente que ya calificaba para 5%.
2. Todo monto (precio de catálogo, subtotales, umbral de Q1,500) se representa como entero en centavos (`price_cents INTEGER`), nunca `float`.
3. La condición "sumatoria mayor a Q.1,500" es estricta (`> 150000` centavos) — exactamente Q.1,500.00 **no** califica para 5% de servicios (solo para el 3% si además hay 2+ servicios).
**Por qué**: Las condiciones de 5% son superconjunto de las de 3% (ej. 5+ productos también cumple "3+ productos") — evaluar en el orden equivocado otorgaría el descuento menor por error. Comparar `float > 1500` es un defecto clásico de redondeo binario; centavos enteros lo eliminan estructuralmente. El PDF dice "mayor a", no "mayor o igual", así que el límite exacto se excluye explícitamente.
**Impacto**: G2 no cierra sin una tabla de tests unitarios que cubra cada frontera exacta: 1 servicio, 2 servicios, 2 servicios con suma = Q1,500.00 exacto (debe dar 3%, no 5%), 2 servicios con suma = Q1,500.01 (debe dar 5%), y análogo para productos en 2, 3, 4, 5 ítems.

---

## ADR-006 — Snapshot de precio y descuento al confirmar, no recálculo en vivo

**Decisión**: Al confirmar (o editar) una asistencia, se guarda en la propia confirmación una copia congelada de: nombre, precio y categoría de cada ítem elegido, y el % de descuento resultante por categoría. Cambios futuros al catálogo (ADR-007) no alteran confirmaciones ya hechas.
**Por qué**: Decisión ratificada por el líder del proyecto. El "portafolio personalizado" que ventas prepara para cada cliente debe reflejar exactamente lo que el cliente vio y aceptó al confirmar — si el admin baja un precio después y eso recalculara el descuento retroactivamente (ej. Q1,600 → 5%, admin baja un precio y la misma selección ahora suma Q1,500 → ya no calificaría para 5%), el cliente perdería un beneficio que ya se le mostró, sin haber hecho nada.
**Impacto**: La tabla de confirmación necesita columnas propias de snapshot (no solo foreign keys al catálogo vivo). El catálogo se puede editar libremente sin job de recálculo masivo.

---

## ADR-007 — Soft-delete en catálogo y slots

**Decisión**: "Eliminar" un servicio/producto o un slot de evento lo marca `activo = false`; la fila nunca se borra físicamente.
**Por qué**: Ratificado por el líder del proyecto. Combinado con ADR-006 (snapshot), las confirmaciones pasadas ya no dependen de que la fila del catálogo siga existiendo activa — pero borrarla físicamente además rompería cualquier reporte histórico agregado por ítem/slot que el admin panel quiera mostrar más adelante. Un ítem/slot inactivo simplemente deja de ofrecerse a nuevos clientes.
**Impacto**: Todo query de catálogo/slots hacia el formulario público filtra `WHERE activo = true`; el admin panel puede ver inactivos para reactivarlos.

---

## ADR-008 — Modelo de evento: un evento activo, múltiples slots de día/horario administrados

**Decisión**: La plataforma maneja un solo evento activo a la vez. El admin crea los "slots" (combinaciones de día + horario + cupo máximo) dentro de ese evento. El cliente elige un slot al confirmar.
**Por qué**: Ratificado por el líder del proyecto — el evento tiene "varios días y horarios de duración", no es una fecha única, y tampoco son ferias distintas gestionadas independientemente (eso sería alcance no pedido por el PDF). El campo "Fecha y Hora" del mockup se traduce a un selector de slot, no a un date-picker libre.
**Impacto**: Tabla `slots` con `fecha_hora_inicio`, `fecha_hora_fin`, `cupo_maximo`, `cupos_disponibles`, `activo`. Ver ADR-009 para la mecánica de cupo.

---

## ADR-009 — Cupo por slot: contador atómico como única autoridad, orden de lock determinista en cambio de slot

**Decisión**:
1. Cada slot tiene una columna `cupos_disponibles` (contador), que es la **única autoridad** de cupo — todo camino de escritura que afecte cupo (confirmar, editar-cambiar-slot, cancelar) pasa por el mismo mecanismo transaccional; ningún otro endpoint modifica esa columna de otra forma.
2. Confirmar/tomar un slot: `UPDATE slots SET cupos_disponibles = cupos_disponibles - 1 WHERE id = $1 AND cupos_disponibles > 0` dentro de la misma transacción que crea la confirmación. Si el `UPDATE` afecta 0 filas, se revierte toda la transacción y el cliente recibe "cupo lleno, elige otro horario".
3. Cambiar de slot en una edición (ADR-010 permite esto): liberar (`+1`) el slot viejo y tomar (`-1` con el mismo `WHERE > 0`) el nuevo, en una sola transacción. Para evitar deadlock cuando dos clientes intercambian slots en direcciones opuestas simultáneamente (A→B y B→A), los locks de fila se adquieren en **orden determinista por `id` de slot ascendente**, sin importar cuál es origen y cuál destino.
**Por qué**: Preocupación planteada directamente por el líder del proyecto sobre condiciones de carrera al confirmar en simultáneo, y sobre escalabilidad. El `UPDATE` condicional con lock de fila de Postgres es correcto en cualquier nivel de concurrencia (2 usuarios o 300,000) porque Postgres serializa automáticamente los `UPDATE` sobre la misma fila — no es una optimización que deje de funcionar al crecer, es la forma correcta desde el día uno. El orden de lock determinista es el mecanismo estándar para evitar deadlock cuando una transacción toca dos filas cuyo orden de adquisición podría variar entre transacciones concurrentes.
**Impacto**: El GET de slots expone `cupos_disponibles` para que el frontend lo muestre (UX informativa), pero nunca es la fuente autoritativa — el servidor siempre revalida con el `UPDATE` condicional. La columna lleva `CHECK (cupos_disponibles >= 0)` — si algún camino de escritura llegara a violar la invariante, la transacción falla ruidosamente en vez de sobrevender en silencio. Cuando el admin edita `cupo_maximo` de un slot con reservas existentes (G5): si el nuevo máximo es menor que `cupo_maximo - cupos_disponibles` (reservas actuales), el `UPDATE` se rechaza con error explícito — nunca se ajusta `cupos_disponibles` a un valor negativo. Ver **Gate abierto** sobre cancelación (§ Gates abiertos).

---

## ADR-010 — Deadline de edición anclado al slot del cliente, evaluado contra el slot vigente antes del cambio

**Decisión**: Cada confirmación pierde su ventana de edición N días antes de la fecha/hora del **slot que el cliente tiene elegido** (no una fecha global del evento completo). N es configurable desde el admin panel. Cuando un cliente edita y cambia de slot (ADR-009), la elegibilidad para editar se evalúa contra el slot **que tenía antes del cambio**, no el nuevo.
**Por qué**: Ratificado por el líder del proyecto — un cliente que asiste el día 3 del evento no debería perder su ventana de edición en la misma fecha que alguien que asiste el día 1. Evaluar contra el slot antes del cambio evita que un cliente ya fuera de su ventana de edición "escape" el deadline simplemente moviéndose a un slot más lejano en el tiempo.
**Impacto**: El endpoint de edición valida `ahora < (slot_actual.fecha_hora_inicio - N días)` **antes** de aplicar cualquier cambio (incluyendo el cambio de slot). Si falla, responde con el mensaje de "ediciones no permitidas, comuníquese al departamento de ventas al [teléfono ficticio]" acordado en la entrevista, sin tocar la confirmación.

---

## ADR-011 — Identidad de cliente: código de acceso emailado, sin contraseñas

**Decisión**: La primera confirmación es pública/anónima (solo requiere email + datos del formulario). Al confirmar, se genera y envía por email un código de acceso. Toda edición posterior requiere email (pre-llenado si viene del link del correo) + ese mismo código — no se genera un código nuevo por cada login, el mismo código sirve para todas las ediciones hasta que expira. El código expira cuando pasa la fecha/hora del slot vigente de esa confirmación.
**Por qué**: Es la única lectura no-circular posible del flujo descrito por el líder del proyecto (un código "no puede" ser requerido para la acción que lo genera). Cubre el requisito "Plus" de manejo de sesión sin construir un sistema de cuentas con contraseñas — la identidad del cliente ya es su email, un código de un solo emisión reduce fricción de UX frente a pedir que recuerde una contraseña para un formulario de una sola vez al año.
**Impacto**: Sesión implementada como JWT de corta duración emitido tras validar email+código, en cookie `httpOnly`, con claim `confirmacion_id`. Tabla de confirmaciones necesita `codigo_acceso_hash` (nunca texto plano) y expiración derivada del slot vigente (ADR-010).
**Gate abierto**: no se ratificó explícitamente si el código es numérico (ej. OTP de 6 dígitos) o alfanumérico — se propone 6 dígitos numéricos por ser más fácil de transcribir desde un correo en móvil; confirmar antes de G4.

---

## ADR-012 — Búsqueda de catálogo: filtro client-side sobre catálogo precargado

**Decisión**: El catálogo completo de servicios/productos activos se trae una sola vez al cargar el formulario (`GET /catalogo`). El campo "Buscar Servicios y Productos" filtra en memoria en el navegador, sin llamadas adicionales al servidor por tecleo.
**Por qué**: Ratificado por el líder del proyecto. Con el volumen esperado (catálogo de una feria — decenas de ítems, no miles), un filtro en memoria es instantáneo y evita mantener un endpoint de búsqueda con debounce e índices que el PDF no sugiere que se necesiten.
**Impacto**: Si el catálogo creciera a un volumen que lo justifique, este ADR quedaría superado por una versión server-side — no bloquea el diseño actual.

---

## ADR-013 — Admin panel: consumo del "portafolio" por ventas, CRUD de catálogo y slots, auth con cuenta seed fija

**Decisión**: Existe un admin panel protegido por login (email+password, JWT) donde el equipo de ventas: (a) ve/filtra/exporta (CSV) todas las confirmaciones con su selección y descuento; (b) gestiona (CRUD + soft-delete) el catálogo de servicios/productos; (c) gestiona (CRUD + soft-delete) los slots del evento y su cupo máximo; (d) configura el N de días del deadline de edición (ADR-010). La cuenta admin se crea por seed/migración — no hay registro público ni gestión de múltiples usuarios/roles.
**Por qué**: El objetivo de negocio del PDF no es solo "que el cliente confirme" — es *"preparar un portafolio de promociones personalizado para cada cliente que confirme"*. Sin una forma de ver/exportar las confirmaciones, ese objetivo no se cumple: los datos quedarían atrapados en la base de datos. Ratificado por el líder del proyecto, quien optó explícitamente por CRUD completo de catálogo (no solo un seed fijo) para darle a ventas control real de la feria. Multi-usuario/roles se descarta por ser alcance no pedido por el PDF.
**Impacto**: G5 (ver `PLAN_DESARROLLO.md`) — es el gate más grande después del núcleo, y depende de G0-G3 (contrato, catálogo, slots) ya existentes para tener algo que administrar.

---

## ADR-014 / ADR-015 — Infraestructura: Railway (deploy) + Resend (email)

**Decisión**: Los 3 servicios Dockerizados (web, api, postgres) se despliegan en Railway. Los correos (código de acceso, notificación de confirmación) se envían vía Resend.
**Por qué**: Railway tiene free/hobby tier con soporte multi-servicio, Postgres administrado incluido, deploy directo desde GitHub y URL pública automática — menos fricción que Render (servicios free "duermen" y añaden latencia a la demo en vivo) o Fly.io (más configuración manual, free tier históricamente inestable). Resend tiene free tier generoso (3,000 emails/mes) y no requiere verificar dominio propio para pruebas, a diferencia de SMTP genérico (contraseñas de aplicación, límites bajos, riesgo de caer en spam durante la demo).
**Impacto**: `Dockerfile` por servicio + `railway.json`/config de Railway. Variable de entorno `RESEND_API_KEY`. G1 (deploy pipeline verde) se construye contra este objetivo desde el principio, no al final.

---

## ADR-016 — Librerías de frontend: React Hook Form + Zod + TanStack Query

**Decisión**: Formularios (registro, login admin, CRUD admin) con React Hook Form + los mismos schemas Zod del contrato (ADR-003) para validación. Estado de servidor (fetch de catálogo, slots, confirmaciones) con TanStack Query.
**Por qué**: Ratificado por el líder del proyecto tras comparar contra "solo React + fetch nativo" — la alternativa sin librerías requeriría reimplementar loading/error/cache a mano en cada pantalla, lo cual son más líneas de código repetitivo, no menos, justo lo contrario de lo que ayuda a "entender cada línea". RHF+Zod+TanStack Query es el combo estándar de la industria, con curva de aprendizaje razonable viniendo de Angular Reactive Forms (conceptualmente equivalente: validación declarativa + estado de formulario controlado).
**Impacto**: Cada pantalla de formulario reutiliza el mismo schema Zod que ya valida en el backend — sin reglas de validación duplicadas entre cliente y servidor.

---

## ADR-017 — Testing: unitario en lógica de negocio + integración en API, sin e2e de UI

**Decisión**: El motor de descuento y las reglas de cupo/deadline llevan tests unitarios exhaustivos (Vitest). Los endpoints de API llevan tests de integración contra una base de datos real de test. No se construye una suite e2e de UI con Playwright.
**Por qué**: Ratificado por el líder del proyecto — el tiempo se invierte donde hay más riesgo de bug real (lógica de negocio y persistencia), no en cobertura de UI que consume tiempo de implementación/mantenimiento con un deadline ajustado. Cada gate cierra con: tests pasan → `/code-review` sobre el diff → pase del advisor → walkthrough escrito → commit (acordado en la entrevista).
**Impacto**: G2-G5 no cierran sin su tabla de tests correspondiente (ver `PLAN_DESARROLLO.md`).

---

## ADR-018 — Sin agentes de validación por gate; `/code-review` + advisor + tests como mecanismo

**Decisión**: Se descarta un pipeline de agentes especializados (arquitectura, código, mantenibilidad, testing) por gate. Cada gate se valida con: sus tests pasando, `/code-review` sobre el diff, y una consulta al advisor — ambos anclados a este documento como fuente de verdad.
**Por qué**: Un agente nuevo por dimensión (spawneado sin contexto previo) leería el mismo spec que `/code-review`/advisor y daría feedback que se solapa, sin aportar ángulos distintos — es ceremonia que consume tiempo sin señal adicional. `/code-review` y el advisor, ambos con acceso al spec completo (a diferencia de un agente fresco sin este documento), cubren arquitectura/código/mantenibilidad sin la redundancia.
**Impacto**: Ninguna infraestructura de agentes adicional que mantener.

---

## ADR-019 — Notas de escalabilidad (fuera de alcance de esta entrega)

**Decisión**: No se diseña explícitamente para 300,000 usuarios simultáneos. El mecanismo de cupo (ADR-009) es correcto en cualquier escala por construcción (lock de fila de Postgres), así que no requiere rediseño si el tráfico creciera. Si en el futuro hubiera picos reales (ej. apertura de inscripciones a una hora fija), el siguiente paso sería cachear el catálogo/slots de **lectura** (Redis o cache HTTP) — la ruta de escritura (confirmar) no necesita cambiar.
**Por qué**: Diseñar infraestructura para 300k usuarios en una prueba técnica con deadline es sobre-ingeniería que no aporta señal evaluativa. Lo que sí importa — y ya está resuelto — es que la corrección del sistema no dependa de la escala.
**Impacto**: Ninguno para esta entrega; queda documentado como respuesta razonada a la pregunta, no como trabajo pendiente.

---

## ADR-020 — Backend: Express + Zod

**Decisión**: `apps/api` se construye con Express, rutas/controladores organizados por dominio (feature-first, mismo principio que ADR-002), validación de request/response con los schemas Zod de ADR-003.
**Por qué**: Ratificado por el líder del proyecto frente a dos alternativas: NestJS (más cercano conceptualmente a Angular, pero agrega ceremonia — módulos, providers, decoradores — que es carga cognitiva extra aprendiendo React y Node a la vez) y Next.js API routes (un solo proceso para frontend y backend, pero difumina la separación Equipo1/Equipo2 de ADR-002 y complica presentar "servicios Dockerizados" separados como pide el PDF literalmente). Express es minimalista y no impone estructura, lo que deja que el feature-first layout sea la única fuente de organización.
**Impacto**: `apps/api/src/<dominio>/routes.ts` + `controller.ts` + `service.ts` por dominio (registration, catalog, slots, auth, admin).

## ADR-021 — Base de datos: PostgreSQL

**Decisión**: PostgreSQL como único motor de persistencia.
**Por qué**: Ratificado por el líder del proyecto. Es el motor que ya asumían los ADRs de cupo atómico (ADR-009) — depende de locks de fila y transacciones ACID multi-tabla (liberar+tomar cupo en una sola transacción). MongoDB habría requerido rediseñar ese mecanismo (transacciones más limitadas, sin locks de fila nativos); MySQL también soporta el mecanismo (InnoDB) pero Postgres es lo que Railway ofrece administrado sin fricción adicional (ADR-014).
**Impacto**: Ninguno de los ADRs de cupo/transacciones necesita reescritura — ya asumían esta base de datos.

## ADR-022 — Rate limiting y bloqueo temporal contra fuerza bruta (código de acceso y login admin)

**Decisión**: Máximo N intentos fallidos por email+IP en una ventana de tiempo (ej. 5 intentos / 15 minutos) tanto en el endpoint de validación de código de acceso (ADR-011) como en el login admin (ADR-013). Al exceder el límite, bloqueo temporal (ej. 15-30 min) antes de permitir nuevos intentos para ese email.
**Por qué**: Ratificado por el líder del proyecto. Un código de acceso de 6 dígitos numéricos (1,000,000 de combinaciones) es adivinable por fuerza bruta sin límite de intentos — dado que el evento puede durar varios días, la ventana de exposición sin rate limiting sería de días, no minutos. Es una vulnerabilidad real y barata de mitigar, no un endurecimiento opcional.
**Impacto**: Middleware de rate limiting (ej. tabla `intentos_fallidos` con email/IP/timestamp, o `express-rate-limit` con store en Postgres/Redis) aplicado a los endpoints de validar-código y login-admin. G4 (código de acceso) y G5 (login admin) no cierran sin este middleware activo y su test correspondiente (N+1 intentos → bloqueo).

## Gates abiertos (pendientes de ratificar antes del gate correspondiente)

1. **ADR-011** — formato del código de acceso (numérico 6 dígitos vs. alfanumérico). Confirmar antes de G4.
2. **Cancelación de confirmación** — el PDF no menciona que un cliente pueda cancelar su asistencia (solo editar selección/slot). Si se agrega, ADR-009 debe extenderse: cancelar también libera cupo (`+1`) por el mismo mecanismo transaccional. Confirmar si es scope antes de G4, o queda explícitamente fuera.
3. **Formato del reporte exportado por ventas** (ADR-013) — CSV simple vs. algo más estructurado. Confirmar antes de G5.
