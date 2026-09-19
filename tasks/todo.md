# Gate 7 — Estilos visuales (Tailwind minimalista)

Plan completo: `C:\Users\jose_\.claude\plans\ancient-twirling-swan.md` (también reconstruible desde `spec/PLAN_DESARROLLO.md` Gate 7 + `spec/todo.md`).

Decisiones confirmadas con el líder: paleta "neutralizar, papel cálido queda"; verificación visual la hace el líder (no hay Chrome conectado); libertad para reorganizar layout.

## Fase 1 — Tokens (`apps/web/src/index.css`)
- [x] Ajustar `tinta`, `apagado`, `borde`, `borde-fuerte` a neutros (papel/superficie/jade/alerta sin cambio)
- [x] Calcular luminancia relativa de los 7 pares de contraste y anotar ratios (script en scratchpad, todos PASS)
- [x] **Parada 1**: entorno ya estaba levantado (postgres/api/web); avisado al líder

## Fase 2 — `shared/ui` existentes
- [x] `Card.tsx` — rediseñado (`border-t` + `p-5`, sin caja completa) y adoptado en `CajaSeleccionados`, `ConfirmarPage`, `EditarPage`. Polimórfico (`as`) para preservar `<section>`/`role="region"` en `CajaSeleccionados`
- [x] `Button.tsx` — tamaño `sm`/`md` + variantes `accent`/`link`; absorbió `CatalogoBuscador.tsx:76-82` (nombre accesible condicional preservado) y `CajaSeleccionados.tsx:46-52`
- [x] `Input.tsx` / `Select.tsx` — sin cambios de clase; el aligerado sale del token `borde-fuerte` (Fase 1)
- [x] `Table.tsx` — nuevos `TableHeaderRow`/`TableHeaderCell`/`TableRow`/`TableCell` absorben el `<thead>`/`<tbody>` repetido en las 4 páginas de admin
- [x] `Field.tsx` — reusa `StatusMessage` para el error, reenviando `id={errorId}` que el `cloneElement` necesita

## Fase 3 — `shared/ui` nuevos
- [x] `PageShell` (variant `ancho`/`centrado` — solo 2 anchos, no 3: el shell "cliente" y el "admin" se unificaron en uno). **Cambio visible a señalar al líder**: `ConfirmarPage`/`EditarPage` pasan de `max-w-4xl` a `max-w-5xl` (más ancho) — antes esa bifurcación no respondía a ninguna razón de diseño, ahora es un solo valor
- [x] `PageHeader` (eyebrow + título + subtítulo)
- [x] `StatusMessage` — reenvía `id` vía `{...props}`; los 5 `aria-describedby` verificados con grep tras el swap
- [x] `AdminNav.tsx` → `NavLink` con estado activo
- [x] Tracking arbitrario: `CajaSeleccionados` h2 (`0.15em`) y `CatalogoBuscador` h3 (`0.1em`) unificados a `tracking-widest` (stock, 0.1em) — eran literalmente el mismo patrón (label pequeño de sección) con dos valores distintos. El eyebrow (`0.2em`, rol de "kicker" de marca, ahora centralizado en `PageHeader`) y el `tracking-wide` de encabezados de tabla (rol de grilla de datos densa) quedan deliberadamente distintos — son roles visuales distintos, no la misma duplicación. El código de 6 dígitos (`0.3em`) no forma parte de este grupo, es legibilidad de un OTP.

## Fase 4 — Pantallas (9 rutas + 3 componentes)
- [x] Cliente: `LoginPage`, `ConfirmarPage`, `EditarPage` (4-5 ramas de estado c/u — sin anidar `<main>`, son returns mutuamente excluyentes)
- [x] Admin: `AdminLoginPage`, `InvitacionesPage`, `ConfirmacionesPage`, `CatalogoAdminPage`, `SlotsAdminPage`, `ConfiguracionDescuentoPage`
- [x] `CatalogoBuscador`, `CajaSeleccionados` (`SlotSelector` sin cambios — ya estaba limpio)
- [ ] Bloque de totales del recibo — NO promovido (queda duplicado en `ConfirmarPage`/`EditarPage`); se evaluó y no salía limpio sin tocar más lógica de lo necesario para un gate visual

## Cambios visibles a señalar explícitamente en la Parada 2
- `ConfirmarPage`/`EditarPage` pasan de `max-w-4xl` a `max-w-5xl` (unificación del ancho, ver Fase 3)
- Los 2 banners de error a pantalla completa (`ConfirmarPage`/`EditarPage` cuando falla la carga) pasan a `text-sm` — antes tamaño default; ahora empatan con el resto de banners de la app vía `StatusMessage`. Deliberado, no bug.
- `Card` (panel del recibo y de la caja de selección) perdió el borde punteado y ganó fondo `superficie` más plano — el borde completo se mantuvo (no solo `border-t`) porque `papel` vs `superficie` da 1.06:1, casi invisible; sin borde en las 4 caras las 2 cajas apiladas en `ConfirmarPage` se hubieran visto como una sola columna blanca continua

## No tocar en este gate (reportar aparte)
- Labels hand-rolled (`CatalogoBuscador.tsx:34`, `ConfirmacionesPage.tsx:45`, `CatalogoAdminPage.tsx:58`) — no convertir a `<Field>`
- Estados de carga inline sin `role="status"`
- Tablas de admin sin estado vacío

## Cierre
- [x] `npm run test` — 88 (api) + 12 (web) + 20 (shared-types) = 120/120 verde
- [x] `npm run build` limpio en los 3 workspaces
- [x] `/code-review` (acotado a los 21 archivos de Gate 7) — 0 hallazgos
- [x] `advisor` — 2 pases, encontró y se corrigió el borde de `Card` y el disabled de `Button variant="link"`
- [x] Walkthrough en `spec/todo.md`
- [x] `spec/ESTADO_PLAN.md` — G7 queda ABIERTO pendiente de visto bueno visual
- [x] Parada 2: el líder verificó las pantallas y dio el visto bueno (2026-09-19) — Gate 7 CERRADO
- [ ] Confirmar con el líder si hay issues/milestone de GitHub para G7/G8 (arrastrado al próximo prompt)
- [x] No commitear — árbol listo, decirlo explícitamente en el handoff

## Siguiente
Gate 8 — ver `spec/next-session-prompt.md` y `spec/PLAN_DESARROLLO.md` v1.5.
