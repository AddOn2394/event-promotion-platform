# Plan de Desarrollo — Plataforma de Confirmación de Asistencia

> Versión: 1.4 | Fecha: 2026-09-19 — agrega Gate 7 (estilos visuales, Tailwind minimalista) después del cierre de Gate 6; Gate 6 deja de ser el último gate del plan.
> Versión: 1.3 | Fecha: 2026-09-16 — agrega descuento configurable (ADR-023) y notificaciones con seguimiento de entrega (ADR-024) a Gate 2/Gate 4/Gate 5; corrige exit criterio de Gate 0 (ubicación del schema, ADR-003) y lo marca cerrado
> Ver `DECISIONES_ARQUITECTURA.md` para el "por qué" de cada decisión referenciada aquí.
> Regla de cierre de gate (acordada en la entrevista): **tests pasan → `/code-review` sobre el diff → pase del advisor → walkthrough escrito → commit.** Ningún gate se da por cerrado sin los 5 pasos.

## Principio de secuencia

Entregable concreto: **formulario + descuento correcto + confirmación persistida + accesible por URL pública**. Ese es el mínimo que debe quedar verde primero. Revisión (v1.1): el formulario **no** es público todo acceso (primera confirmación incluida) requiere invitación previa + código de acceso, así que "núcleo mínimo" incluye ese login desde Gate 2, no como feature de Gate 4. Todo lo demás se apila encima, y cada gate posterior es descartable sin romper los anteriores si el tiempo se agota.

---

## Gate 0 — Contrato cerrado

**Exit criterio**: Existe al menos un schema Zod real (`ConfirmarAsistenciaRequest`/`Response`) en `packages/shared-types` (ADR-003 corregida: los schemas viven ahí, no en `apps/api`), el OpenAPI se genera de ahí, los tipos llegan a `packages/shared-types`, y **ambas** apps (`apps/web`, `apps/api`) compilan importando ese paquete. Nada de feature code antes de esto.

**Cerrado 2026-09-16** — ver `spec/todo.md` para el walkthrough.

## Gate 1 — Deploy pipeline verde

**Exit criterio**: `Dockerfile` por servicio + `docker-compose.yml` local funcionando, desplegado en Render (ADR-014, revisada) con una ruta "hello world" de cada servicio (`GET /health` en la API, página placeholder en web) accesible por URL pública. Se adelanta este gate precisamente porque es la causa más común de fallar esta prueba en el último día.

## Gate 2 — (invitación + login por código, slots ya existen, sin cupo atómico todavía)

**Exit criterio**:
- Catálogo de servicios/productos seedeado (fijo, sin CRUD todavía — eso es Gate 5).
- Tabla `slots` (ADR-008) ya existe y está seedeada (día/horario), **sin** columna `cupos_disponibles`/mecánica de cupo todavía — eso es exclusivo de Gate 3, para no construir el formulario dos veces.
- Tabla `invitaciones` (ADR-011 revisada) + **dos pantallas reales de admin** (no un endpoint sin UI): login admin (cuenta seed, ADR-013) y una pantalla "Invitar cliente" (email/nombre → genera código de 6 dígitos, lo hashea, envía el email vía Resend, ADR-015). El resto del admin panel (catálogo, slots, export) sigue siendo Gate 5 — estas dos pantallas se adelantan porque sin ellas no hay forma de generar el primer código para demostrar el flujo.
- Login de cliente por email + código (JWT en cookie httpOnly) como **puerta de entrada obligatoria** al formulario — no existe ninguna ruta de confirmación sin este login, ni siquiera la primera vez.
- Formulario (detrás del login): datos del cliente + selección de servicios/productos con las dos cajas en vivo (ADR-004) + selector de slot.
- Motor de descuento: por categoría, tier más alto gana, centavos enteros, frontera Q1,500 estricta (ADR-005) — **función pura, testeable sin DB**, implementada como lista de reglas (predicado + %, ADR-023) para cumplir open/closed desde el día uno, no como refactor posterior.
- Tabla `configuracion_descuento` (ADR-023) seedeada con los valores del PDF (2 servicios/3%, 2 servicios+Q1,500/5%, 3 productos/3%, 5 productos/5%) — **sin UI de admin todavía** (eso es Gate 5, HU-12); el motor lee de esta tabla, no de constantes hardcodeadas, desde G2.
- Confirmar persiste con snapshot de precio/descuento **y snapshot de los umbrales usados** (ADR-006, ADR-023), referenciando el slot elegido y la invitación desde el día uno (así ADR-010, que ancla al slot, es real desde G2 y no requiere migración en Gate 4).
- Tabla `notificaciones` (ADR-024, con `idconfirmacion` nullable): se crea un registro (tipo=`invitacion`) cuando se invita a un cliente en Gate 2; `estado_envio` pasa de `pendiente` a `enviado` en cuanto la llamada a la API de Resend responde 200 — **sin webhook todavía**, así que un rebote posterior no se detecta hasta Gate 5. El webhook de Resend y la visibilidad en admin panel son Gate 5, pero la tabla y el registro existen desde aquí.
- Todo desplegado en la URL pública de Gate 1.
- Tests unitarios cubriendo la tabla de fronteras de ADR-005 (2 servicios en Q1,500.00 exacto → 3%, Q1,500.01 → 5%, análogo productos en 3/4/5).

**Este es el entregable mínimo aceptable si el tiempo se agota después de aquí** — ya incluye el login por invitación, no es una versión "pública" temporal.

## Gate 3 — Cupo atómico por slot

**Exit criterio**:
- Se agrega `cupos_disponibles` (+ `CHECK (cupos_disponibles >= 0)`, ADR-009) a la tabla `slots` ya existente desde Gate 2.
- Formulario muestra cupos disponibles (informativo, no autoritativo).
- Cupo atómico: `UPDATE ... WHERE cupos_disponibles > 0` transaccional (ADR-009).
- Test de integración que confirma que dos confirmaciones concurrentes contra un slot con cupo=1 dejan exactamente una exitosa y una rechazada (test con dos transacciones/conexiones simultáneas, no solo secuencial).

## Gate 4 — Edición, deadline, cambio de slot y cancelación

**Exit criterio** (el login por código ya existe desde Gate 2 — este gate cubre las reglas de qué se puede hacer *después* de autenticado):
- Deadline evaluado contra el slot vigente antes de cualquier cambio (ADR-010); mensaje de "ediciones cerradas, contacte a ventas" con teléfono ficticio cuando aplica.
- Cambio de slot en edición: transacción con liberar+tomar cupo, orden de lock determinista (ADR-009), rollback limpio si destino lleno.
- Cancelación de asistencia (ADR-009 revisada): libera cupo, marca `estado = 'cancelada'` sin borrar la fila.
- Código expira cuando pasa el slot vigente de la confirmación (o el evento completo si nunca confirmó).
- Rate limiting + bloqueo temporal por email (sin IP, ADR-022 corregida) en el endpoint de validación de código.
- Notificaciones de confirmación, edición, cancelación y reconfirmación (registro + envío, ADR-024) — sin el código de acceso en ninguna de ellas.
- Tests: deadline exacto (1 segundo antes/después del corte), cambio de slot exitoso, cambio de slot rechazado por destino lleno (confirmación no debe quedar en estado inconsistente — ni perdió el slot viejo ni ganó el nuevo), cancelación libera cupo correctamente, bloqueo tras N intentos fallidos de código.

## Gate 5 — Admin panel completo

**Exit criterio**:
- Login admin y pantalla "Invitar cliente" ya existen desde Gate 2 (con rate limiting + bloqueo temporal, ADR-022) — este gate agrega **reenviar código** a una invitación existente.
- Vista de confirmaciones: listar/filtrar (confirmada/cancelada/sin respuesta/rebotada, ADR-024)/exportar CSV con las columnas fijas decididas en ADR-013.
- CRUD + soft-delete de catálogo (ADR-007).
- CRUD + soft-delete de slots, configuración del N de días de deadline (ADR-010).
- Pantalla de configuración de umbrales de descuento (HU-12, ADR-023) con la validación de coherencia 5%≥3%.
- Webhook `POST /webhooks/resend` (ADR-024) que actualiza `notificaciones.estado_envio`.
- Tests de integración sobre las reglas de soft-delete (ítem/slot desactivado no aparece en el formulario, pero sigue íntegro en confirmaciones ya hechas vía snapshot), sobre la validación de coherencia de umbrales (HU-12), y sobre el webhook actualizando el estado correcto según el payload de Resend.

## Gate 6 — Endurecimiento final

**Exit criterio**: Revisión de código final end-to-end (`/code-review` sobre el branch completo, no solo el último diff), accesibilidad básica del formulario público (labels asociados a inputs, foco visible, contraste, navegable por teclado) — **no** una auditoría AXE completa: ese requisito vivía en el `CLAUDE.md` de Angular que se está reemplazando (ADR-001), nunca lo pidió el PDF ni el líder del proyecto explícitamente, así que se reduce a accesibilidad básica salvo que se indique lo contrario. Walkthrough consolidado de todas las fases, limpieza de código muerto/TODOs pendientes, `README.md` del repo actualizado con instrucciones de setup local y link de la demo pública.

**Cerrado 2026-09-19** — ver `spec/todo.md` para el walkthrough. Deja de ser el último gate del plan: se agregó Gate 7 después de este cierre, a pedido del líder del proyecto.

## Gate 7 — Estilos visuales (Tailwind, minimalista)

**Exit criterio**: Pasada de diseño visual sobre `apps/web` completo (pantallas de cliente **y** admin panel — ambas comparten los mismos tokens de `index.css` y componentes de `shared/ui`, así que separarlas rompería la consistencia que ese sistema ya da) hacia una estética minimalista: paleta reducida/neutra, tipografía con jerarquía clara, más espacio en blanco, menos decoración (bordes/sombras/color) que no aporte función. Es **solo visual** — ningún cambio de comportamiento, de contrato, ni de lógica de negocio.

- Revisar y ajustar los tokens de `@theme` en `apps/web/src/index.css` (colores, fuentes) hacia el resultado minimalista — sin introducir un sistema de diseño nuevo ni una librería de componentes (ADR-001/ADR-016 no se reabren; sigue siendo Tailwind puro + los componentes de `shared/ui`).
- Los cambios de estilo fluyen desde `shared/ui` (`Button`, `Input`, `Select`, `Field`, `Card`, `Table`) hacia afuera — no overrides por pantalla que dupliquen estilos que el componente compartido ya debería dar (mismo principio de "Shared Stylesheet First" de `CLAUDE.md`).
- Mantener el contraste AA y el `:focus-visible` que Gate 6 ya dejó correctos — un ajuste de paleta que los rompa no es aceptable sin volver a verificarlos.
- **Verificación visual real en navegador obligatoria** (Chrome, vía las herramientas de automatización) antes de cerrar el gate — Gate 6 dejó pendiente la verificación visual dos veces seguidas (accesibilidad y el formulario de deadline de `SlotsAdminPage`) por no tener el navegador conectado; este gate es puramente visual, así que no cerrar sin haberlo visto renderizado.
- Correr la suite completa (`npm run test`) para confirmar que ningún test existente dependía de una clase o de texto que el rediseño cambie.
- Si durante el rediseño aparece algo que parezca un bug de comportamiento (no solo visual), no arreglarlo en silencio dentro de este gate — señalarlo aparte, mismo criterio que el resto del plan.

**Alcance explícitamente fuera de este gate**: no se agrega dark mode, ni animaciones/microinteracciones nuevas, ni un rediseño de la estructura de información (layout de secciones/orden de campos) salvo que haga falta para el resultado minimalista — si hace falta, confirmar con el líder del proyecto antes, no asumir.

---

## Estado actual

| Gate | Estado |
|---|---|
| 0 | No iniciado |
| 1 | No iniciado |
| 2 | No iniciado |
| 3 | No iniciado |
| 4 | No iniciado |
| 5 | No iniciado |
| 6 | No iniciado |

**Próxima acción**: los 3 gates abiertos ya quedaron resueltos en `DECISIONES_ARQUITECTURA.md` v1.1. Sigue ejecutar la limpieza del scaffold Angular + reescritura de `CLAUDE.md` + scaffold del monorepo (`apps/web`, `apps/api`, `packages/shared-types`).
