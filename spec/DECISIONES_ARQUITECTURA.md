# Decisiones de Arquitectura — Plataforma de Confirmación de Asistencia (Feria de Promociones)

> Versión: 1.4 | Fecha: 2026-09-16
> Estado: ADRs 001-025 acordadas en entrevista spec-driven (7+ rondas). ADR-011 revisada tras corrección del líder del proyecto (identidad de cliente basada en invitación previa, nunca anónima). ADR-003 revisada (schemas Zod en `packages/shared-types`, no en `apps/api`), y **extendida** por ADR-025 (funciones puras de negocio sin I/O también pueden vivir en `shared-types` cuando ambas apps necesitan el mismo resultado exacto). ADR-022 corregida (rate limiting por email, no por IP — un atacante real rota de IP). ADR-023 (descuento: umbrales configurables + escenarios como código, open/closed) y ADR-024 (notificaciones con seguimiento de entrega) agregadas a petición del líder del proyecto tras revisar el spec funcional completo. ADR-025 (motor de descuento compartido, ver abajo) ratificada durante Gate 2 al construir el motor. Los 3 gates abiertos de la v1.0 quedan resueltos (§ final del documento).
> Origen: `Prueba_Tecnica_Disagro.pdf` — plataforma para que clientes confirmen asistencia a un evento anual de promociones, seleccionando servicios/productos de interés, con descuento automático según reglas de negocio.

---

## ADR-001 — Stack: React + Node.js + TypeScript

**Decisión**: La plataforma se construye en React (frontend) y Node.js/TypeScript (backend).
**Por qué**: El requirement list dice textualmente *"El stack permitido para la prueba es node.js, typescript y react"*. 

---

## ADR-002 — Monorepo con workspaces

**Decisión**: Un solo repositorio (`npm workspaces`) con `apps/web` (React), `apps/api` (Node/TS/Express), `packages/shared-types` (tipos generados desde el contrato Zod, ver ADR-003).
**Por qué**: La alternativa (repos separados para Equipo 1/Equipo 2) requeriría publicar `shared-types` como paquete externo (registro npm privado, submódulo git, o copiar/pegar tipos a mano en cada cambio de contrato), Además la separación Equipo 1/Equipo 2 se logra por convención de carpetas (`apps/web` = Equipo 1, `apps/api` = Equipo 2) y de commits (`feat(web): ...` / `feat(api): ...`), no por límite de repositorio.
**Impacto**: Un `docker-compose.yml` para desarrollo local con los 3 servicios (web, api, postgres). Estructura interna de `apps/web/src` feature-first (dominio `registration/`, `admin/`, `shared/`).

---

## ADR-003 — Contrato Frontend/Backend (corregida)

**Decisión**: Los schemas Zod se escriben una sola vez en **`packages/shared-types`** (no en `apps/api`). De ahí se genera el spec OpenAPI (`zod-to-openapi`) y los tipos TypeScript inferidos. Tanto `apps/api` (validación de request/response de cada endpoint) como `apps/web` (validación de formularios con React Hook Form, ADR-016) importan los mismos objetos Zod desde `packages/shared-types`.
**Por qué**: Versión original de este ADR ponía los schemas en `apps/api`, pero `apps/web` necesita los **objetos** Zod reales para validar formularios, no solo los tipos TS inferidos — y una app no debe depender de otra app en un monorepo (`apps/web` importando de `apps/api` invertiría la dependencia esperada). `packages/shared-types` es el único lugar correcto para algo que ambas apps consumen por igual. Corrección detectada al diagramar la arquitectura del contrato (`spec/SPEC_FUNCIONAL.md` §7), ratificada por el líder del proyecto.
**Impacto**: Gate 0 no cierra hasta que exista al menos un schema Zod end-to-end (ej. `ConfirmarAsistenciaRequest`) en `packages/shared-types`, el OpenAPI generado, y ambas apps (`apps/web`, `apps/api`) compilando contra ese paquete.

---

## ADR-004 — Descuento por categoría (Servicios y Productos independientes)

**Decisión**: El % de descuento de Servicios aplica solo sobre el subtotal de servicios seleccionados; el % de Productos aplica solo sobre el subtotal de productos. No se suman en un % global.
**Por qué**: El mockup muestra dos cajas independientes ("Descuento obtenido en Servicios 3%" / "en Productos 5%"), evidencia directa de que son cálculos separados, además en vez de una sola lista combinada se agregarán dos cajas separadas "Servicios seleccionados" / "Productos seleccionados" que se alimentan en vivo al marcar ítems, con opción de quitar, cada una mostrando su propio % de descuento (ver ADR-012 sobre cómo se filtra el catálogo hacia esas cajas).

---

## ADR-005 — Evaluación de porcentaje de descuento (más alto gana), frontera Q1,500 estricta

**Decisión**:
1. Para cada categoría se evalúa primero la condición de 5%; si no se cumple, se evalúa la de 3%. Nunca se otorga 3% a un cliente que ya calificaba para 5%.
2. Todo monto (precio de catálogo, subtotales, umbral de Q1,500) se representa como entero en centavos (`price_cents INTEGER`), nunca `float`.
3. La condición "sumatoria mayor a Q.1,500" es estricta (`> 150000` centavos) — exactamente Q.1,500.00 **no** califica para 5% de servicios (solo para el 3% si además hay 2+ servicios).
**Por qué**: Las condiciones de 5% son superconjunto de las de 3% (ej. 5+ productos también cumple "3+ productos") — evaluar en el orden equivocado otorgaría el descuento menor por error.
**Impacto**: Gate 2 no cierra sin una tabla de tests unitarios que cubra cada frontera exacta: 1 servicio, 2 servicios, 2 servicios con suma = Q1,500.00 exacto (debe dar 3%, no 5%), 2 servicios con suma = Q1,500.01 (debe dar 5%), y análogo para productos en 2, 3, 4, 5 ítems.

---

## ADR-006 — Snapshot de precio y descuento al confirmar, no recálculo en vivo

**Decisión**: Al confirmar (o editar) una asistencia, se guarda en la propia confirmación una copia congelada de: nombre, precio y categoría de cada ítem elegido, y el % de descuento resultante por categoría. Cambios futuros al catálogo (ADR-007) no alteran confirmaciones ya hechas.
**Por qué**: El "portafolio personalizado" que ventas prepara para cada cliente debe reflejar exactamente lo que el cliente vio y aceptó al confirmar — si el admin baja un precio después y eso recalculara el descuento retroactivamente (ej. Q1,600 → 5%, admin baja un precio y la misma selección ahora suma Q1,500 → ya no calificaría para 5%), el cliente perdería un beneficio que ya se le mostró, sin haber hecho nada.
**Impacto**: La tabla de confirmación necesita columnas propias de snapshot (no solo foreign keys al catálogo vivo). El catálogo se puede editar libremente sin job de recálculo masivo.

---

## ADR-007 — Soft-delete en catálogo y slots

**Decisión**: "Eliminar" un servicio/producto o un slot de evento lo marca `activo = false`; la fila nunca se borra físicamente.
**Por qué**: Las confirmaciones pasadas ya no dependen de que la fila del catálogo siga existiendo activa, pero borrarla físicamente además rompería cualquier reporte histórico agregado por ítem que el admin panel quiera mostrar más adelante. Un ítem inactivo simplemente deja de ofrecerse a nuevos clientes.
**Impacto**: Todo query de catálogo/slots hacia el formulario público filtra `WHERE activo = true`; el admin panel puede ver inactivos para reactivarlos.

---

## ADR-008 — Modelo de evento: un evento activo, múltiples slots de día/horario administrados

**Decisión**: La plataforma maneja un solo evento activo a la vez. El admin crea los "slots" (combinaciones de día + horario + cupo máximo) dentro de ese evento. El cliente elige un slot al confirmar.
**Por qué**: El evento puede tener "varios días y horarios de duración", no es necesariamente una fecha única, y tampoco son ferias distintas gestionadas independientemente (edgecase no contemplato). El campo "Fecha y Hora" del mockup se traduce a un selector de slot, no a un date-picker libre.
**Impacto**: Tabla `slots` con `fecha_hora_inicio`, `fecha_hora_fin`, `cupo_maximo`, `cupos_disponibles`, `activo`. Ver ADR-009 para la mecánica de cupo.

---

## ADR-009 — Cupo por slot: contador atómico como única autoridad, orden de lock determinista en cambio de slot

**Decisión**:
1. Cada slot tiene una columna `cupos_disponibles` (contador), que es la **única autoridad** de cupo — todo camino de escritura que afecte cupo (confirmar, editar-cambiar-slot, cancelar) pasa por el mismo mecanismo transaccional; ningún otro endpoint modifica esa columna de otra forma.
2. Confirmar/tomar un slot: `UPDATE slots SET cupos_disponibles = cupos_disponibles - 1 WHERE id = $1 AND cupos_disponibles > 0` dentro de la misma transacción que crea la confirmación. Si el `UPDATE` afecta 0 filas, se revierte toda la transacción y el cliente recibe "cupo lleno, elige otro horario".
3. Cambiar de slot en una edición (ADR-010 permite esto): liberar (`+1`) el slot viejo y tomar (`-1` con el mismo `WHERE > 0`) el nuevo, en una sola transacción. Para evitar deadlock cuando dos clientes intercambian slots en direcciones opuestas simultáneamente (A→B y B→A), los locks de fila se adquieren en **orden determinista por `id` de slot ascendente**, sin importar cuál es origen y cuál destino.
**Por qué**: Puede darse un condición de carrera al confirmar en simultáneo, y sobre escalabilidad. El `UPDATE` condicional con lock de fila de Postgres es correcto en cualquier nivel de concurrencia (2 usuarios o 300,000) porque Postgres serializa automáticamente los `UPDATE` sobre la misma fila, no es una optimización que deje de funcionar al crecer, es la forma correcta desde el día uno. El orden de lock determinista es el mecanismo estándar para evitar deadlock cuando una transacción toca dos filas cuyo orden de adquisición podría variar entre transacciones concurrentes.
**Impacto**: El GET de slots expone `cupos_disponibles` para que el frontend lo muestre, pero nunca es la fuente autoritativa, el servidor siempre revalida con el `UPDATE` condicional. Si algún camino de escritura llegara a violar la invariante, la transacción falla ruidosamente en vez de sobrevender en silencio. Cuando el admin edita `cupo_maximo` de un slot con reservas existentes (Gate 5): si el nuevo máximo es menor que `cupo_maximo - cupos_disponibles` (reservas actuales), el `UPDATE` se rechaza con error explícito — nunca se ajusta `cupos_disponibles` a un valor negativo.
**Cancelación — decidido**: sí forma parte del scope. El cliente autenticado (email+código, ADR-011) puede cancelar su asistencia antes del deadline (ADR-010) desde la misma pantalla de edición. Cancelar usa el mismo mecanismo transaccional (`+1` sobre `cupos_disponibles` del slot liberado) y marca la confirmación con `estado = 'cancelada'` — **no se borra la fila** (el snapshot de ADR-006 se conserva para que ventas vea en su export, ADR-013, que ese cliente canceló, en vez de que la confirmación desaparezca sin dejar rastro).
**`cancelada` es reanudable, no terminal**: como el código de acceso vive mientras viva la invitación (ADR-011 revisada), un cliente cancelado puede volver a entrar con su mismo email+código y reconfirmar — elige un slot (el mismo u otro) y se aplica un `-1` fresco con el mismo `WHERE cupos_disponibles > 0`. La fila de confirmación se reutiliza (mismo `invitacion_id`, `UNIQUE`), solo cambia su `estado` de vuelta a `confirmada` y se sobrescribe el snapshot.

---

## ADR-010 — Deadline de edición anclado al slot del cliente, evaluado contra el slot vigente antes del cambio

**Decisión**: Cada confirmación pierde su ventana de edición N días antes de la fecha/hora del **slot que el cliente tiene elegido**. N es configurable desde el admin panel. Cuando un cliente edita y cambia de slot (ADR-009), la elegibilidad para editar se evalúa contra el slot **que tenía antes del cambio**, no el nuevo.
**Por qué**: Un cliente que asiste el día 3 del evento no debería perder su ventana de edición en la misma fecha que alguien que asiste el día 1. Evaluar contra el slot antes del cambio evita que un cliente ya fuera de su ventana de edición "escape" el deadline simplemente moviéndose a un slot más lejano en el tiempo.
**Impacto**: El endpoint de edición valida  **antes** de aplicar cualquier cambio (incluyendo el cambio de slot). Si falla, responde con el mensaje de "ediciones no permitidas, comuníquese al departamento de ventas al [teléfono ficticio]", sin tocar la confirmación.

---

## ADR-011 — Identidad de cliente: invitación previa con código de acceso, nunca anónima (revisada)

**Decisión**: No existe una confirmación pública ni anónima en ningún punto del flujo. Antes de que un cliente pueda siquiera ver el formulario, debe existir una **invitación**: un registro con su email (y opcionalmente nombre) creado desde el admin panel. Al crear la invitación, se genera un código de acceso de **6 dígitos numéricos** y se envía por email junto con el link a la plataforma. El cliente entra siempre con email (pre-llenado desde el link) + ese código, tanto la primera vez que llena el formulario como en cualquier edición posterior. El mismo código sirve para todos los accesos hasta que expira (no se emite uno nuevo por login). El código expira cuando pasa el evento completo — **nunca** por el slot individual de una confirmación (ver el párrafo "Vigencia del código" más abajo; esta frase contradecía esa regla en versiones anteriores del documento, corregido en Gate 4, 2026-09-17, tras detectarlo el advisor).
**Por qué**: Los clientes son conocidos por ventas de antemano, no llegan de forma anónima.
**Impacto**: Nueva entidad `invitaciones` (email, nombre opcional, `codigo_acceso_hash`, `creada_en`, `usada_en` nullable) que existe **antes** de que exista una `confirmacion`, una invitación sin confirmación todavía es un estado válido ("invitado, no ha respondido"). El admin panel necesita, desde el núcleo mínimo (Gate 2, no solo Gate 5), una **pantalla real de admin** (formulario con email/nombre + botón "Invitar") para crear una invitación — no un endpoint sin UI. Sin esto no hay forma de que ventas genere el primer código para demostrar el flujo completo, y el admin panel deja de ser "solo Gate 5" para tener su primera pantalla (login admin + crear invitación) ya en Gate 2. El resto del admin panel (ver ADR-013: catálogo, slots, export) sigue siendo Gate 5. El formulario deja de tener una ruta pública: toda la ruta de confirmación queda detrás de login email+código desde el primer acceso.
**Formato del código**: 6 dígitos numéricos. Más fácil de transcribir desde un correo en móvil que un alfanumérico, y el riesgo de fuerza bruta que un espacio de 1,000,000 combinaciones implicaría queda mitigado por ADR-022 (rate limiting + bloqueo temporal), que ya estaba diseñado para este caso.
**Email bloqueado para edicion**: El campo se muestra pre-llenado y **de solo lectura**; permitir editarlo dejaría que un cliente autenticado confirme asistencia a nombre de otro email. El nombre/apellido de la invitación (si se cargó al crearla) pre-llena el formulario mas sí queda editable — el cliente puede corregir cómo quiere.
**Vigencia del código**: el código vive mientras viva la invitación, y expira al terminar el evento completo (no el slot individual). El slot solo gobierna el deadline de edición (ADR-010), nunca la vigencia de la sesión.
**Una invitación, una confirmación**: `confirmaciones.invitacion_id` lleva `UNIQUE` — un cliente invitado tiene como máximo una confirmación, que se edita en el mismo registro.

---

## ADR-012 — Búsqueda de catálogo: filtro client-side sobre catálogo precargado

**Decisión**: El catálogo completo de servicios/productos activos se trae una sola vez al cargar el formulario (`GET /catalogo`). El campo "Buscar Servicios y Productos" filtra en memoria en el navegador, sin llamadas adicionales al servidor por tecleo.
**Por qué**: Con el volumen esperado, un filtro en memoria es instantáneo y evita mantener un endpoint de búsqueda con debounce e índices.
**Impacto**: Si el catálogo creciera a un volumen que lo justifique, se cambiaria a una server-side con debounce.

---

## ADR-013 — Admin panel: invitaciones, consumo del "portafolio" por ventas, CRUD de catálogo y slots, auth con cuenta seed fija

**Decisión**: Existe un admin panel protegido por login (email+password, JWT, rate limiting según ADR-022) donde el equipo de ventas: (a) **crea invitaciones** de clientes (email + nombre opcional), lo que dispara la generación y envío del código de acceso (ADR-011) — esta pieza mínima existe desde G2, el resto de (b)-(e) es G5; (b) ve/filtra/exporta (CSV) todas las confirmaciones con su selección y descuento; (c) gestiona (CRUD + soft-delete) el catálogo de servicios/productos; (d) gestiona (CRUD + soft-delete) los slots del evento y su cupo máximo; (e) configura el N de días del deadline de edición (ADR-010). La cuenta admin se crea por seed/migración — no hay registro público ni gestión de múltiples usuarios/roles.
**Por qué**: El objetivo de negocio no es solo "que el cliente confirme" — es *"preparar un portafolio de promociones personalizado para cada cliente que confirme"*. Sin una forma de ver/exportar las confirmaciones, ese objetivo no se cumple. Y desde la revisión de ADR-011, sin la capacidad de invitar clientes tampoco hay forma de que exista una sola confirmación — el admin panel deja de ser "solo consumo posterior" para ser también el punto de entrada del flujo completo.
**Formato del export — decidido**: CSV con columnas fijas: nombre, apellidos, email, slot (fecha/hora), servicios seleccionados, productos seleccionados, subtotal servicios, % descuento servicios, subtotal productos, % descuento productos, total, estado (confirmada/cancelada). Sin formato adicional (Excel con estilos, PDF) — el CSV es lo que un equipo de ventas puede abrir e importar a cualquier herramienta sin fricción.
**Impacto**: Gate 5 (ver `PLAN_DESARROLLO.md`) para el CRUD completo — pero el login admin (cuenta seed) y la pantalla de crear invitaciones (a) se adelantan a Gate 2 completos, con UI real, porque sin una forma de que ventas entre y genere el primer código no hay flujo que demostrar. Gate 2 entrega entonces dos pantallas mínimas de admin (login, crear invitación), no un endpoint sin interfaz.

---

## ADR-014 / ADR-015 — Infraestructura: Render (deploy) + Resend (email)

**Decisión (revisada 2026-09-16, ver `spec/todo.md`)**: Los 3 servicios Dockerizados (web, api, postgres) se despliegan en Render. Los correos (código de acceso, notificación de confirmación) se envían vía Resend.
**Por qué**: La decisión original (v1.0-1.3) era Railway, por su free tier con soporte multi-servicio y Postgres administrado. Durante Gate 1 se descubrió que el free tier real de Railway es ~$1/mes de crédito (unas pocas horas de runtime) y bloquea deploys nuevos en horario pico salvo que se pague el plan Hobby ($5/mes) — el líder del proyecto no quiso pagar. Render ofrece Web Services Docker gratis (sin tarjeta de crédito) y Postgres administrado gratis, con deploy directo desde GitHub vía Blueprint (`render.yaml`) — cumple el mismo criterio original ("free tier real, multi-servicio, Postgres incluido") mejor que Railway hoy. Resend no cambia, sigue siendo la elección para email.
**Trade-off aceptado**: la Postgres free de Render se borra automáticamente a los 30 días (hay que recrearla y volver a seedear si el proyecto sigue activo más allá de esa ventana) y los Web Services free "duermen" tras 15 min de inactividad (cold start de ~30-60s en el primer request tras dormir). Aceptable para este proyecto (demo/feria de promociones, no un servicio 24/7 de misión crítica).
**Impacto**: `Dockerfile` por servicio (sin cambios) + `render.yaml` en la raíz (Blueprint de Render, reemplaza cualquier config específica de Railway). Variable de entorno `RESEND_API_KEY`. Gate 1 (deploy pipeline verde) se construye contra este objetivo desde el principio, no al final.

---

## ADR-016 — Librerías de frontend: React Hook Form + Zod + TanStack Query

**Decisión**: Formularios (registro, login admin, CRUD admin) con React Hook Form + los mismos schemas Zod del contrato (ADR-003) para validación. Estado de servidor (fetch de catálogo, slots, confirmaciones) con TanStack Query.
**Por qué**: La alternativa sin librerías requeriría reimplementar loading/error/cache a mano en cada pantalla.
**Impacto**: Cada pantalla de formulario reutiliza el mismo schema Zod que ya valida en el backend — sin reglas de validación duplicadas entre cliente y servidor.

---

## ADR-017 — Testing: unitario en lógica de negocio + integración en API, sin e2e de UI

**Decisión**: El motor de descuento y las reglas de cupo/deadline llevan tests unitarios exhaustivos (Vitest). Los endpoints de API llevan tests de integración contra una base de datos real de test. No se construye una suite e2e de UI con Playwright.
**Por qué**: El tiempo se invierte donde hay más riesgo de bug real (lógica de negocio y persistencia). Cada gate cierra con: tests pasan → `/code-review` sobre el diff → pase del advisor → walkthrough escrito → commit.
**Impacto**: Gate 2-Gate 5 no cierran sin su tabla de tests correspondiente (ver `PLAN_DESARROLLO.md`).

---

## ADR-018 — Sin agentes de validación por gate; `/code-review` + advisor + tests como mecanismo

**Decisión**: Cada gate se valida con: sus tests pasando, `/code-review` sobre el diff, y una consulta al advisor — ambos anclados a este documento como fuente de verdad.
**Por qué**:  `/code-review` y el advisor, ambos con acceso al spec completo (a diferencia de un agente fresco sin este documento), cubren arquitectura/código/mantenibilidad sin la redundancia.
**Impacto**: Ninguna infraestructura de agentes adicional que mantener.

---

## ADR-019 — Notas de escalabilidad

**Decisión**: No se diseña explícitamente para 300,000 usuarios simultáneos. El mecanismo de cupo (ADR-009) es correcto en cualquier escala por construcción (lock de fila de Postgres), así que no requiere rediseño si el tráfico creciera. Si en el futuro hubiera picos reales (ej. apertura de inscripciones a una hora fija), el siguiente paso sería cachear el catálogo/slots de **lectura** (Redis o cache HTTP) — la ruta de escritura (confirmar) no necesita cambiar.
**Por qué**: Lo que sí importa (y ya está resuelto) es que la corrección del sistema no dependa de la escala.
**Impacto**: Ninguno para esta entrega.

---

## ADR-020 — Backend: Express + Zod

**Decisión**: `apps/api` se construye con Express, rutas/controladores organizados por dominio (feature-first, mismo principio que ADR-002), validación de request/response con los schemas Zod de ADR-003.
**Por qué**: NestJS (Agrega módulos, providers, decoradores) y Next.js API routes (un solo proceso para frontend y backend, pero difumina la separación Equipo1/Equipo2 de ADR-002 y complica presentar "servicios Dockerizados" separados). Express es minimalista y no impone estructura, lo que deja que el feature-first layout sea la única fuente de organización.
**Impacto**: `apps/api/src/<dominio>/routes.ts` + `controller.ts` + `service.ts` por dominio (registration, catalog, slots, auth, admin).

## ADR-021 — Base de datos: PostgreSQL

**Decisión**: PostgreSQL como único motor de persistencia.
**Por qué**: Depende de locks de fila y transacciones ACID multi-tabla (liberar+tomar cupo en una sola transacción). MongoDB habría requerido rediseñar ese mecanismo (transacciones más limitadas, sin locks de fila nativos); MySQL también soporta el mecanismo (InnoDB) pero Postgres se adapta mejor a lo que Railway ofrece administrado sin fricción adicional (ADR-014).
**Impacto**: Ninguno.

## ADR-022 — Rate limiting y bloqueo temporal contra fuerza bruta (código de acceso y login admin)

**Decisión**: Máximo N intentos fallidos **por email/cuenta, sin importar la IP de origen** (ej. 5 intentos / 15 minutos) tanto en el endpoint de validación de código de acceso (ADR-011) como en el login admin (ADR-013). Al exceder el límite, bloqueo temporal (ej. 15-30 min) antes de permitir nuevos intentos para ese email.
**Por qué**: Un código de acceso de 6 dígitos numéricos es adivinable por fuerza bruta sin límite de intentos, dado que el evento puede durar varios días, la ventana de exposición sin rate limiting sería de días, no minutos. **Corrección**: la versión original de este ADR contaba también por IP, pero un atacante de fuerza bruta real rota de IP (botnet/dispositivos distintos) precisamente para evadir un límite por IP — ese contador no aporta defensa contra el escenario que motiva este ADR, y además arriesga bloqueos falsos entre clientes legítimos que comparten IP (oficina, NAT). El contador que protege el espacio de combinaciones del código es el de email, sin condición adicional de IP.
**Impacto**: Middleware de rate limiting (ej. tabla `intentos_fallidos` con email/timestamp, o `express-rate-limit` con store en Postgres/Redis) aplicado a los endpoints de validar-código y login-admin. Gate 4 (código de acceso) y Gate 5 (login admin) no cierran sin este middleware activo y su test correspondiente (N+1 intentos → bloqueo).

## ADR-023 — Descuento: umbrales configurables, escenarios nuevos como código (patrón strategy, open/closed)

**Decisión**: Se separan dos problemas que ADR-004/ADR-005 no distinguían:
1. **Cambiar un valor** — los **umbrales** que disparan cada tier (mínimo de servicios/productos, el monto Q1,500) son configurables desde el admin panel, guardados en `configuracion_descuento` (mismo patrón que el N de días del deadline, ADR-010). Los **porcentajes en sí (3%/5%) quedan fijos en código**, no son editables desde esa pantalla — son parte de la forma de la regla (punto 2), no un valor de negocio ajustable, y mantenerlos fijos es lo que conserva la tabla de fronteras exactas de ADR-005 (Q1,500.00/Q1,500.01) como algo testeable de forma determinista.
2. **Agregar un escenario nuevo** (un tercer tier, una regla que combine categorías, una regla con otra forma de condición) — es un cambio de código, no de configuración. El motor de descuento se implementa como una **lista de reglas** (cada una: predicado + % resultante), evaluada de mayor a menor porcentaje (ADR-005 se mantiene: tier más alto gana). Agregar un escenario es agregar un objeto-regla nuevo a la lista, sin modificar las reglas existentes ni el evaluador — esto es lo que exige el principio abierto/cerrado (open/closed) que el líder del proyecto pidió explícitamente para todo el código.
**Por qué**: Un motor de reglas genérico en base de datos (condiciones arbitrarias armadas desde una UI, sin tocar código para ningún escenario) se descarta explícitamente — es sobre-ingeniería para este caso: se convierte en un evaluador de fórmulas con su propia clase de bugs, no se puede testear exhaustivamente contra la tabla de fronteras exactas que exige ADR-005, y el PDF especifica exactamente 4 reglas fijas. La solución de dos niveles (config para valores, código para forma) da extensibilidad real sin ese riesgo.
**Impacto — snapshot de umbrales**: cada confirmación (ADR-006) congela también **qué valores de configuración se usaron** para calcular su descuento (columnas `min_servicios_3pct`, `min_servicios_5pct`, `monto_minimo_5pct_servicios_cents`, `min_productos_3pct`, `min_productos_5pct` en la propia confirmación, o una referencia versionada a `configuracion_descuento`) — si ventas cambia un umbral después, una confirmación pasada sigue siendo explicable con los valores que realmente se usaron, no con los actuales.
**Validación de coherencia**: el admin panel rechaza guardar una configuración donde el umbral de 5% sea más débil que el de 3% (ej. mínimo de servicios para 5% menor que el mínimo para 3%) — eso volvería incoherente la regla "tier más alto gana" de ADR-005.

## ADR-024 — Notificaciones: log con seguimiento de entrega vía webhook de Resend

**Decisión**: Toda comunicación por email (invitación, confirmación, edición, cancelación, reconfirmación) se registra en una entidad `notificaciones` (tipo, `estado_envio` inicial `pendiente`, id del mensaje en Resend, timestamps). Un webhook de Resend (`POST /webhooks/resend`) actualiza `estado_envio` a `enviado` / `fallido` / `rebotado` según el evento real de entrega. Ventas ve este estado en su listado de confirmaciones/invitaciones (ADR-013).
**Por qué**: El reenvío manual (HU-11) no es una mitigación real del riesgo de "email no entregado" — depende de que el cliente se queje. Con seguimiento de entrega, ventas ve proactivamente qué invitaciones rebotaron y puede actuar (llamar al cliente, reenviar a un email alterno) sin depender de que el cliente reporte el problema.
**Reglas de envío**:
- El envío de email ocurre **después** de confirmar la transacción de cupo (ADR-009), nunca dentro de ella — si Resend falla o tarda, la confirmación ya debe estar comprometida; solo el registro de `notificaciones` en estado `pendiente` se escribe dentro de la transacción, el envío real es un paso posterior.
- El correo de confirmación/edición/cancelación/reconfirmación **nunca** repite el código de acceso — eso es exclusivo del correo de invitación (ADR-011); repetirlo en cada notificación multiplicaría su exposición en el historial de bandeja del cliente.
**Impacto**: Nueva entidad `notificaciones` con `idinvitacion` (siempre) e `idconfirmacion` (nullable — poblado solo en tipo=confirmacion/edicion/cancelacion/reconfirmacion; en tipo=invitacion no existe confirmación todavía). El registro de invitación se crea en Gate 2 con `estado_envio` pasando a `enviado` en cuanto la llamada a la API de Resend responde 200 (sin webhook todavía — eso sería una falsa señal de éxito solo si Resend acepta el envío pero luego rebota, que es exactamente lo que el webhook de Gate 5 corrige más tarde, moviendo el registro a `rebotado`). Sin el webhook, un registro nunca queda indefinidamente en `pendiente` salvo que la llamada a Resend realmente falle. Un rebote de invitación (`rebotado`) es un estado distinto de "sin respuesta" (`usada_en IS NULL` sin rebote) y de "cancelada" — nunca se agrupan como si fueran lo mismo (mismo principio que la distinción sin-respuesta/cancelada de HU-8).

## ADR-025 — Motor de descuento compartido vía `packages/shared-types` (extiende el alcance de ADR-003)

**Decisión**: La función pura `calcularDescuento` (motor de descuento, ADR-004/ADR-005/ADR-023) vive en `packages/shared-types/src/discount-engine.ts`, no en `apps/api`. Tanto `apps/api` (autoridad real al confirmar, HU-3) como `apps/web` (preview en vivo de las dos cajas, ADR-004) importan la misma función.
**Por qué**: Decisión tomada en sesión de Gate 2 al construir el motor — la alternativa (implementarlo solo en `apps/api` y que `apps/web` reimplemente las mismas reglas a mano para el preview) arriesga que el preview del cliente diverja silenciosamente del cálculo real del servidor (ej. una regla nueva agregada solo del lado del servidor). Compartir la función pura elimina esa clase de bug por construcción. Esto **extiende** el alcance original de ADR-003 (que limitaba `packages/shared-types` a "schemas Zod + tipos + OpenAPI") para incluir también funciones puras de lógica de negocio sin dependencias de infraestructura (sin DB, sin HTTP, sin I/O) que ambas apps necesitan idénticas — no cualquier lógica de negocio, solo la que cumple ese criterio.
**Impacto**: `apps/api` sigue siendo la única autoridad real porque es el único que lee `configuracion_descuento` de la base de datos y persiste el resultado con snapshot (ADR-006) — el motor en sí es solo la función de cálculo, no la orquestación. `apps/web` usa la misma función para el preview, que sigue siendo explícitamente no autoritativo (HU-3: "el servidor recalcula el descuento — nunca confía en el valor mostrado en el cliente"). Precedente para futuras funciones puras de negocio: solo van a `shared-types` si (a) no tocan DB/HTTP/I/O y (b) ambas apps necesitan el mismo resultado exacto — cualquier otro caso se queda en `apps/api` (ADR-020).

## ADR-026 — HU-11 (reenviar código): "reenviar" genera un código nuevo, no recupera el original (corrige el criterio literal de HU-11)

**Decisión**: El endpoint de reenvío (HU-11, `POST /admin/invitaciones/:id/reenviar`) genera un código de 6 dígitos **nuevo**, lo hashea, sobreescribe `codigo_acceso_hash` de la invitación existente, y lo envía por email — invalidando el código anterior para logins futuros. No reenvía el código original.
**Por qué**: El criterio de aceptación original de HU-11 (*"reenvía el mismo código, no genera uno nuevo"*) es incompatible con ADR-011, que dicta que solo se persiste `codigo_acceso_hash` (bcrypt), nunca el código en texto plano — precisamente para que un dump de la base de datos no exponga códigos de acceso activos. Con esa garantía de seguridad ya vigente desde Gate 2 sesión A, no existe ningún valor en texto plano que "reenviar" pueda recuperar. Detectado durante el `/code-review` + advisor de Gate 2 sesión B, ratificado con el líder del proyecto: la alternativa (guardar también el código en texto plano) reintroduce el riesgo exacto que el hasheo evitaba, a cambio de solo cumplir el criterio al pie de la letra.
**Impacto**: `spec/SPEC_FUNCIONAL.md` HU-11 actualizado con los criterios corregidos. Una sesión de cliente ya autenticada (JWT ya emitido antes del reenvío) sigue válida hasta que expire — invalidar el código no revoca JWTs ya firmados, solo impide un *login nuevo* con el código viejo. El endpoint de reenvío es Gate 5 (ver `PLAN_DESARROLLO.md`), pero esta corrección se ratifica ahora porque salió a la luz al construir el flujo de invitación completo en Gate 2 sesión B.

## ADR-027 — HU-8 (export CSV): una sola columna "nombre", "apellidos" se omite (corrige la lista de columnas fija de ADR-013)

**Decisión**: El CSV de `GET /admin/confirmaciones/export.csv` emite una columna `nombre` con el valor completo de `invitaciones.nombre_cliente`. La columna `apellidos` que ADR-013/HU-8 fijaban en la lista original **se omite**.
**Por qué**: ADR-013 fijó las columnas del export como "nombre, apellidos, email, ...", pero el modelo de datos (`invitaciones.nombre_cliente`, columna única de texto libre) existe así desde Gate 2 — HU-1 y HU-3 ya describían el campo del formulario como "nombre/apellidos" combinado, nunca como dos campos separados. No hay un valor de apellidos que extraer sin inventar una regla de split (ej. por el primer espacio), que rompería con nombres compuestos y arriesgaría datos incorrectos en el export que ventas usa para preparar el portafolio (HU-8). Detectado al construir el CSV en Gate 5; consultado con el líder del proyecto, que eligió una sola columna `nombre` sobre las alternativas (split ingenuo, duplicar el valor en ambas columnas, o migrar el modelo de datos para separar nombre/apellidos — descartada por tocar Gate 2/4 ya cerrados sin necesidad).
**Impacto**: `spec/SPEC_FUNCIONAL.md` HU-8 (línea de criterios de aceptación) actualizado para reflejar la columna única. `apps/api/src/admin/service.ts` (`CSV_ENCABEZADOS`) documenta esta decisión inline. Ninguna migración de datos — `nombre_cliente` no cambia de forma.

## ADR-028 — Login con código correcto pero evento terminado no cuenta como intento fallido (ADR-022)

**Decisión**: `auth/service.ts` (`loginCliente`) ya no llama `registrarIntentoFallido` en la rama de `codigoExpirado()` — un login con email y código correctos pero el evento ya terminado responde 401 con el mismo mensaje genérico (`CREDENCIALES_INVALIDAS`, no enumeration), pero sin sumar al contador de `intentos_fallidos_login` de ADR-022. Las otras dos ramas de fallo (email inexistente, código incorrecto) siguen contando igual — sin cambios.

**Por qué**: dejado abierto a propósito en Gate 5 (ver `spec/todo.md`) por ser un juicio de negocio, no un bug — dos lecturas razonables competían: (a) contarlo igual que cualquier 401, tratamiento uniforme y más simple; (b) exentarlo, porque un intento con código *correcto* ya exige conocerlo, que es el objetivo de un ataque de fuerza bruta contra el espacio de 1,000,000 combinaciones (ADR-022), no un paso hacia él — así que exentarlo no abre una vía de ataque nueva. Ratificado con el líder del proyecto en Gate 6: se elige (b). El beneficio concreto es que un cliente legítimo que intenta entrar con su código válido después de que el evento terminó no se queda bloqueado 15 minutos junto con quien sí está adivinando códigos.

**Impacto**: `apps/api/src/auth/service.ts` — una línea removida, comentario inline con la referencia a este ADR. `apps/api/src/auth/auth.integration.test.ts` actualizado para asertar el conteo real en `intentos_fallidos_login` (no un status code indirecto), consistente con el estándar que el advisor exigió en Gate 5 para este tipo de test. Ninguna migración — el `scope` de `intentos_fallidos_login` (migración 0011) no cambia de forma.

## ADR-029 — Fin del evento (ADR-011) también cuenta un slot inactivo con una confirmación vigente

**Decisión**: `obtenerFinDelEvento()` calcula `MAX(fecha_hora_fin)` sobre los slots con `activo = true`, **más** cualquier slot inactivo que todavía tenga una confirmación en estado `confirmada` apuntándole. Antes solo consideraba slots activos.

**Por qué**: encontrado por el `/code-review` end-to-end de Gate 6. `desactivarSlot` (HU-10, ADR-007) no bloquea desactivar un slot que todavía tiene reservas activas — es un soft-delete administrativo sin esa validación. Si el slot más tardío del evento se desactiva después de que un cliente ya confirmó ahí, el fin del evento (ADR-011) "retrocedía" a un slot anterior y ese cliente quedaba con el código expirado (`codigoExpirado()` → 401) aunque su horario real todavía no había pasado — una limpieza administrativa terminaba bloqueando a un cliente legítimo con una reserva vigente. La fórmula "último slot activo" ya estaba ratificada en Gate 4; este es un caso borde que esa decisión no contempló, así que se consultó de nuevo con el líder del proyecto en vez de decidirlo en silencio (entre: ignorar solo slots con reservas activas — elegida; ignorar `activo` por completo; o dejarlo como estaba y documentar el riesgo). Un slot inactivo sin ninguna confirmación vigente sigue excluido del cálculo.

**Impacto**: `apps/api/src/slots/service.ts` (`obtenerFinDelEvento`) — un `OR` agregado a la consulta, comentario inline con la referencia a este ADR. Test nuevo en `apps/api/src/auth/auth.integration.test.ts` (falsificado: revertir el fix hace que el test falle con 401 en vez del 200 esperado). Ninguna migración.

## Gates abiertos — resueltos

