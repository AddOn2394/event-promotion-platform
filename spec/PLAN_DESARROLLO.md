# Plan de Desarrollo — Plataforma de Confirmación de Asistencia

> Versión: 1.0 | Fecha: 2026-09-16
> Ver `DECISIONES_ARQUITECTURA.md` para el "por qué" de cada decisión referenciada aquí.
> Regla de cierre de gate (acordada en la entrevista): **tests pasan → `/code-review` sobre el diff → pase del advisor → walkthrough escrito → commit.** Ningún gate se da por cerrado sin los 5 pasos.

## Principio de secuencia

El PDF evalúa un entregable concreto: **formulario público + descuento correcto + confirmación persistida + accesible por URL pública**. Ese es el mínimo que debe quedar verde primero. Todo lo demás (slots con cupo, edición con código de acceso, admin panel) se apila encima, y cada gate posterior es descartable sin romper los anteriores si el tiempo se agota — se entrega lo que esté verde.

---

## G0 — Contrato cerrado

**Exit criterio**: Existe al menos un schema Zod real (`ConfirmarAsistenciaRequest`/`Response`) en `apps/api`, el OpenAPI se genera de ahí (ADR-003), los tipos llegan a `packages/shared-types`, y **ambas** apps (`apps/web`, `apps/api`) compilan importando ese paquete. Nada de feature code antes de esto.

## G1 — Deploy pipeline verde

**Exit criterio**: `Dockerfile` por servicio + `docker-compose.yml` local funcionando, desplegado en Railway (ADR-014), con una ruta "hello world" de cada servicio (`GET /health` en la API, página placeholder en web) accesible por URL pública. Se adelanta este gate precisamente porque es la causa más común de fallar esta prueba en el último día.

## G2 — Núcleo del PDF (slots ya existen, sin cupo atómico todavía)

**Exit criterio**:
- Catálogo de servicios/productos seedeado (fijo, sin CRUD todavía — eso es G5).
- Tabla `slots` (ADR-008) ya existe y está seedeada (día/horario), **sin** columna `cupos_disponibles`/mecánica de cupo todavía — eso es exclusivo de G3, para no construir el formulario dos veces.
- Formulario público: datos del cliente + selección de servicios/productos con las dos cajas en vivo (ADR-004) + selector de slot.
- Motor de descuento: por categoría, tier más alto gana, centavos enteros, frontera Q1,500 estricta (ADR-005) — **función pura, testeable sin DB**.
- Confirmar persiste con snapshot de precio/descuento (ADR-006), referenciando el slot elegido desde el día uno (así ADR-010/ADR-011, que anclan al slot, son reales desde G2 y no requieren migración en G4).
- Todo desplegado en la URL pública de G1.
- Tests unitarios cubriendo la tabla de fronteras de ADR-005 (2 servicios en Q1,500.00 exacto → 3%, Q1,500.01 → 5%, análogo productos en 3/4/5).

**Este es el entregable mínimo aceptable si el tiempo se agota después de aquí.**

## G3 — Cupo atómico por slot

**Exit criterio**:
- Se agrega `cupos_disponibles` (+ `CHECK (cupos_disponibles >= 0)`, ADR-009) a la tabla `slots` ya existente desde G2.
- Formulario muestra cupos disponibles (informativo, no autoritativo).
- Cupo atómico: `UPDATE ... WHERE cupos_disponibles > 0` transaccional (ADR-009).
- Test de integración que confirma que dos confirmaciones concurrentes contra un slot con cupo=1 dejan exactamente una exitosa y una rechazada (test con dos transacciones/conexiones simultáneas, no solo secuencial).

## G4 — Edición post-confirmación: código de acceso y deadline

**Exit criterio**:
- Confirmar dispara email (Resend, ADR-015) con código de acceso (ADR-011) — **Gate abierto de ADR-011 (formato del código) debe resolverse antes de empezar esta fase.**
- Login de edición: email + código → JWT en cookie httpOnly.
- Deadline evaluado contra el slot vigente antes de cualquier cambio (ADR-010); mensaje de "ediciones cerradas, contacte a ventas" con teléfono ficticio cuando aplica.
- Cambio de slot en edición: transacción con liberar+tomar cupo, orden de lock determinista (ADR-009), rollback limpio si destino lleno.
- Código expira cuando pasa el slot vigente de la confirmación.
- Rate limiting + bloqueo temporal en el endpoint de validación de código (ADR-022).
- Tests: deadline exacto (1 segundo antes/después del corte), cambio de slot exitoso, cambio de slot rechazado por destino lleno (confirmación no debe quedar en estado inconsistente — ni perdió el slot viejo ni ganó el nuevo), bloqueo tras N intentos fallidos de código.

## G5 — Admin panel

**Exit criterio**:
- Login admin (cuenta seed, ADR-013) con rate limiting + bloqueo temporal (ADR-022).
- Vista de confirmaciones: listar/filtrar/exportar CSV (formato exacto — **Gate abierto**, confirmar antes de empezar esta fase).
- CRUD + soft-delete de catálogo (ADR-007).
- CRUD + soft-delete de slots, configuración del N de días de deadline (ADR-010).
- Tests de integración sobre las reglas de soft-delete (ítem/slot desactivado no aparece en formulario público, pero sigue íntegro en confirmaciones ya hechas vía snapshot).

## G6 — Endurecimiento final

**Exit criterio**: Revisión de código final end-to-end (`/code-review` sobre el branch completo, no solo el último diff), accesibilidad básica del formulario público (labels asociados a inputs, foco visible, contraste, navegable por teclado) — **no** una auditoría AXE completa: ese requisito vivía en el `CLAUDE.md` de Angular que se está reemplazando (ADR-001), nunca lo pidió el PDF ni el líder del proyecto explícitamente, así que se reduce a accesibilidad básica salvo que se indique lo contrario. Walkthrough consolidado de todas las fases, limpieza de código muerto/TODOs pendientes, `README.md` del repo actualizado con instrucciones de setup local y link de la demo pública.

---

## Estado actual

| Gate | Estado |
|---|---|
| G0 | No iniciado |
| G1 | No iniciado |
| G2 | No iniciado |
| G3 | No iniciado |
| G4 | No iniciado |
| G5 | No iniciado |
| G6 | No iniciado |

**Próxima acción**: revisar `DECISIONES_ARQUITECTURA.md` completo con el líder del proyecto, resolver los 3 "Gates abiertos" que apliquen a G0-G2, luego ejecutar limpieza del scaffold Angular + reescritura de `CLAUDE.md` + scaffold del monorepo (`apps/web`, `apps/api`, `packages/shared-types`).
