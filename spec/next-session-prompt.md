# Prompt — Próxima sesión: Gate 8 (formato numérico, comunicación profesional y estado "Fallida")

Continuamos `event-promotion-platform`. **Gate 7 (estilos visuales) está cerrado** — el líder verificó las pantallas en el navegador y dio el visto bueno el 2026-09-19. Ver `spec/ESTADO_PLAN.md` y la última entrada de `spec/todo.md` ("Gate 7 — CERRADO tras visto bueno visual del líder…"). El líder agregó **Gate 8** al cierre de esa sesión: ver `spec/PLAN_DESARROLLO.md` v1.5 para el exit criterio completo.

Lee antes de escribir código: `tasks/lessons.md` si existe, `spec/PLAN_DESARROLLO.md` Gate 8, la entrada final de `spec/todo.md`, `spec/SPEC_FUNCIONAL.md` HU-8 y HU-3 (tabla de fronteras), y ADR-005/ADR-024/ADR-025 en `spec/DECISIONES_ARQUITECTURA.md`. Este gate **cambia texto visible y contenido de correos**, así que entra en plan mode (varios archivos + cambio de comportamiento) y se planifica antes de tocar código. La regla de Gate 7 "cero cambios de texto" ya no aplica.

## Antes de empezar — dos cosas para el líder

1. **Estado del árbol de git.** Hoy el índice (staged) contiene **Gate 6** y el árbol de trabajo (sin stage) contiene **Gate 7** más 3 archivos nuevos sin trackear (`apps/web/src/shared/ui/PageShell.tsx`, `PageHeader.tsx`, `StatusMessage.tsx`) y `tasks/`. Para que la ronda final de `/code-review` de Gate 8 tenga un diff limpio, el líder debería commitear en dos pasos: primero `git commit` (Gate 6, lo que ya está staged), luego `git add` de lo de Gate 7 (incluidos los 3 archivos nuevos) y segundo commit. **El asistente nunca hace commit** — preguntar si ya se hizo; si no, acotar el review a los archivos que toque Gate 8 y decirlo.
2. **Tono del texto de cara al cliente.** Hoy las pantallas y correos usan voseo ("Usá", "Seleccioná", "Ingresá"). Para "más profesional" el líder puede querer usted o mantener voseo. **Preguntar, no asumir** — cambia cada cadena de las pantallas y correos.

## Qué falta construir

Todo lo siguiente está **sin implementar**. Orden sugerido: 1 → 2 → 3 → 4 → 5, cerrando cada bloque con build + tests.

### 1. Separador de miles en montos (`Q1,500.00`)
- Hoy `formatearCents` (`apps/web/src/shared/format.ts`) hace `` `Q${(cents / 100).toFixed(2)}` `` — sin separador. Se usa en `CajaSeleccionados`, `CatalogoBuscador`, `ConfirmarPage`, `EditarPage`, `ConfirmacionesPage`, `CatalogoAdminPage`.
- Los correos **duplican** el formato inline: `apps/api/src/registration/service.ts` líneas ~79-81 (`Q${(x / 100).toFixed(2)}`). Extraer **una sola función** y usarla en ambos lados. Decidir dónde vive: `packages/shared-types` ya aloja funciones puras compartidas (ADR-025) y es el lugar natural para que web y api no la dupliquen — confirmarlo con el líder si implica ADR.
- Usar formato explícito y determinista (coma de miles, punto decimal), no depender del locale del navegador/ICU de Node. Enteros: no operar en float sobre el resultado (CLAUDE.md).
- **NO tocar el CSV**: `centsAQuetzales` en `apps/api/src/admin/service.ts` (~línea 299) es un formato de máquina; una coma de miles rompería la columna. Dejarlo en `toFixed(2)` y documentar por qué.
- Los inputs admin en centavos (`Precio (centavos)`, umbral `montoMinimo5pctServiciosCents`) son campos de captura, no montos mostrados — no se formatean; evaluar solo si conviene una ayuda visual con el equivalente en quetzales (sería feature nueva → preguntar).
- Tests: fronteras de ADR-005 en el formateador — `150000` → `Q1,500.00`, `150001` → `Q1,500.01`, `100000000` → `Q1,000,000.00`, `0`, `5` → `Q0.05`. Los tests existentes buscan `/Q485\.00/` y siguen pasando (menos de mil).

### 2. Correos profesionales y explicativos
- Estado actual: HTML mínimo de `<p>` sueltos. Plantillas: `invitacionEmailHtml` (`apps/api/src/admin/service.ts` ~línea 71, la usan crear invitación y reenviar código), `confirmacionEmailHtml(titulo, resultado)` (`apps/api/src/registration/service.ts` ~línea 76, la usan confirmación, edición, cancelación y reconfirmación). Asuntos hoy: `"Tu código de acceso — Feria de Promociones"` y `"Tu nuevo código de acceso — Feria de Promociones"`; los de confirmación/edición están en `registration/service.ts` (~líneas 281 y 415).
- Objetivo: una plantilla HTML **compatible con clientes de correo** (Outlook incluido: layout con tablas, **estilos en línea**, sin CSS externo ni Tailwind), coherente con la paleta (`papel`/`tinta`/`jade`), con **versión de texto plano** (`text` en `resend.emails.send`, hoy `mailer.ts` solo manda `html`), nombre de remitente legible (`"Feria de Promociones <…>"` — hoy `from` es solo la dirección) y asuntos claros.
- Contenido explicativo: qué es la feria, qué debe hacer el cliente y por dónde, y en los correos de confirmación/edición **el detalle real** — hoy solo muestran subtotales/descuentos/total: agregar ítems elegidos, fecha y horario del slot, hasta cuándo puede editar (deadline, ADR-010) y cómo contactar a ventas. Los datos ya están en la respuesta/transacción; **no** hacer consultas fuera de la transacción para armarlo si eso reabre el problema de lectura-antes-de-escribir de Gate 6.
- **Seguridad**: los correos interpolan datos de usuario (`nombreCliente`, nombres de ítems del snapshot). Escapar todo HTML interpolado — hoy no se escapa nada. Test que lo pruebe con un nombre tipo `<script>` / `"><b>`.
- **El código de acceso nunca va en confirmación/edición/cancelación** (Gate 4, ADR-024); solo en invitación y reenvío. Test que lo confirme.
- El teléfono de ventas es un **placeholder ficticio** (`5555-5555`, `apps/api/src/registration/service.ts` ~línea 28): pedir el real al líder o dejarlo marcado.
- Ver cómo los tests de integración capturan/mockean el envío antes de cambiar la firma de `enviarEmail` (la mayoría corre sin Resend real).

### 3. Pantallas del cliente más explicativas y profesionales
- Alcance: `LoginPage`, `ConfirmarPage`, `EditarPage` y sus pantallas de éxito/cancelación/error (`apps/web/src/auth/pages`, `apps/web/src/registration/pages`, componentes `CatalogoBuscador`, `CajaSeleccionados`, `SlotSelector`). El admin panel **no** entra salvo lo de "Fallida" (bloque 4).
- Ideas concretas a proponer al líder (no imponer): instrucciones breves por paso (1. elegí servicios/productos, 2. elegí horario, 3. confirmá), explicar cómo se aplica el descuento y sus umbrales (hoy solo aparece un badge `3%`), recibo de éxito con **detalle** (ítems, horario, total) y qué pasa después (te llegó un correo, hasta cuándo podés editar), mensajes de error accionables, y mostrar el deadline de edición en `EditarPage`.
- Mantener: contraste AA y `:focus-visible` de Gate 6/7, los `aria-describedby` (`login-error`, `confirmar-error`, `editar-error`, `cancelar-error`, `items-error`) que `StatusMessage` reenvía por `id`, y usar `shared/ui` (`PageShell`, `PageHeader`, `StatusMessage`, `Card`, `Button`) — **no** crear estilos de pantalla sueltos.
- **Tests acoplados a texto** — cambiar estos textos rompe estos tests y hay que actualizarlos a propósito: `App.test.tsx` (heading `/ingresar/i`), `LoginPage.test.tsx` (labels `/email/i`, `/código de acceso/i`, botón `/ingresar/i`), `ConfirmarPage.test.tsx` (heading `/confirmar asistencia/i`, botón `/agregar servicio de prueba/i`, label `/horario/i`, `findByText(/confirmación registrada/i)`), `CajaSeleccionados.test.tsx` (`/3%/`, `/Q485\.00/`, botón `/quitar masaje relajante/i`), `CatalogoBuscador.test.tsx` (`/buscar/i`, `/agregado/i`, `/agregar crema facial/i`), `AdminLoginPage.test.tsx`, `InvitacionesPage.test.tsx` (`/invitación creada/i`). No hay `sr-only` en la app: **el nombre accesible es el texto visible**.

### 4. Estado "Fallida" en el listado de invitaciones (opción 2 elegida por el líder)
- Problema: `calcularEstadoInvitacion` (`apps/api/src/admin/service.ts` ~línea 152) solo mapea `rebotado` → "Rebotada"; un envío `fallido` cae en "Sin respuesta", así que ventas no distingue "el cliente no entró" de "el correo nunca salió".
- **Primero ADR-030** en `spec/DECISIONES_ARQUITECTURA.md` (cambia HU-8/ADR-024: de 4 a 5 estados que nunca se agrupan) y actualizar `spec/SPEC_FUNCIONAL.md` HU-8. Nada de implementación silenciosa (CLAUDE.md).
- Implementación: `EstadoInvitacionAdmin` en `packages/shared-types` (+ regenerar `openapi.json`, correr el agente `api-contract-documenter`), `calcularEstadoInvitacion`, `ETIQUETA_ESTADO`/`ESTADOS` en `InvitacionesPage.tsx` y `ConfirmacionesPage.tsx`, el filtro y el export CSV, y tests.
- Comportamiento a preservar: el estado se calcula con la notificación de invitación **más reciente** (`LEFT JOIN LATERAL … ORDER BY creada_en DESC LIMIT 1`), así que un reenvío exitoso limpia "Fallida" — probado a mano hoy (una invitación tuvo `fallido` y luego `enviado`). Decidir con el líder qué pasa con `pendiente` (hoy también cae en "Sin respuesta") y con una invitación con confirmación + envío fallido (hoy manda el estado de la confirmación).

### 5. Observabilidad del envío de correo
- `enviarEmail` (`apps/api/src/shared/mailer.ts`) devuelve `{exito:false, error}` pero **nadie registra `error`**; solo queda `estado_envio='fallido'`. Hoy hubo que deducir la causa (API key de relleno) mirando la DB y el `.env`. Registrar el motivo (log al menos; guardarlo en `notificaciones` sería cambio de esquema → ADR/migración, preguntar).

## Ronda final de revisión (pedida por el líder)

Al terminar los 5 bloques, una **última ronda completa**, en este orden — sin saltarse ninguno:
1. `npm run test` verde en los 3 workspaces y `npm run build` limpio (ver "Entorno" abajo — los tests de `apps/api` necesitan variables exportadas).
2. `/code-review` (nivel medium o high) sobre el diff de Gate 8. Si el líder ya commiteó Gates 6 y 7, el diff es limpio; si no, acotar por archivos y decirlo. Si el líder quiere una revisión más profunda del branch completo, `/code-review ultra` lo lanza **el líder** (el asistente no puede).
3. `advisor` — al menos un pase de orientación antes de implementar y uno antes de dar por cerrado.
4. Verificar con el agente `api-contract-documenter` que `packages/shared-types/openapi.json` sigue sincronizado (cambia el enum de estados).
5. Walkthrough en `spec/todo.md` (fecha del día), `spec/ESTADO_PLAN.md` (G8 cerrado o abierto con la razón), `tasks/lessons.md` si hubo correcciones del líder.
6. **No hacer commit.** Dejar el árbol listo y decirlo explícitamente.

Verificación visual: la hace el líder (no hay Chrome conectado a las sesiones del asistente salvo que se conecte). Dejar el entorno levantado y listar rutas + qué correo revisar.

## Entorno — cosas que costaron tiempo hoy

- `.env` **no define `DATABASE_URL`** (solo `POSTGRES_*`). Levantar la API desde un shell limpio sin exportarla da `500 "Error interno"` en cualquier endpoint con DB (`SASL: client password must be a string`). Dev: `DATABASE_URL=postgres://event_promotion:dev_local_password@localhost:5432/event_promotion`. Tests: la misma URL con `/event_promotion_test` (README, sección de tests). Además exportar `FRONTEND_URL`, `JWT_SECRET`, `RESEND_WEBHOOK_SECRET`. Considerar documentar/añadir `DATABASE_URL` de dev al `.env.example` y al README si falta.
- La API en modo `tsx watch` **no relee el `.env`** al cambiarlo — reiniciar el proceso tras tocar `RESEND_*`.
- Endpoint real del login admin: `POST /admin/auth/login`. Pantalla: `/admin/login`. Credenciales de dev en `.env` (`ADMIN_EMAIL`/`ADMIN_PASSWORD`).
- Resend: `RESEND_FROM_EMAIL=onboarding@resend.dev` solo entrega al correo de la cuenta de Resend. **Invitar a terceros exige verificar un dominio propio** (tarea operativa del líder: Resend → Domains, registros DNS, luego `RESEND_FROM_EMAIL=algo@sudominio.com`). Hasta entonces, probar correos solo contra el correo de la cuenta.
- Tras editar `apps/web`, Vite recarga solo; `shared-types` requiere `npm run build -w packages/shared-types` si cambia el paquete (el `dist/` lo consumen api y web).

## Contexto que ya no hace falta redecidir

- ADR-001 a ADR-029: no se reabren salvo contradicción real (este gate agrega ADR-030 para el estado "Fallida").
- Gate 7 cerrado: tokens de `index.css` (paleta neutral con papel cálido), componentes de `shared/ui`, contraste AA verificado con luminancia relativa real (tabla en `spec/todo.md`). No reabrir decisiones visuales sin pedido del líder.
- Pendientes operativos que **no** son de código y no bloquean este gate: dominio en Resend, deploy a Render (nada de Gate 2+ está desplegado), los dos juicios de negocio de Gate 5 sin resolver, milestone/issues de GitHub para G7/G8 (preguntar si existen).
- Hallazgos de Gate 7 reportados y **no** corregidos (ahora sí caben en Gate 8 si el líder quiere): tres `<label>` hand-rolled sin `<Field>` (`CatalogoBuscador`, `ConfirmacionesPage`, `CatalogoAdminPage`), estados de carga inline sin `role="status"`, tablas de admin sin estado vacío. Ofrecerlos, no asumirlos.

**No hagas commit.** El usuario comitea siempre — deja el árbol de trabajo listo y dilo explícitamente al terminar.
