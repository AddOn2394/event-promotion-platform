# Prompt — Próxima sesión: Gate 7 (Estilos visuales — Tailwind minimalista)

Continuamos `event-promotion-platform`. **Gate 6 (endurecimiento final) está cerrado** — ver `spec/ESTADO_PLAN.md` y `spec/todo.md`, entrada "2026-09-19 (Gate 6 — Endurecimiento final: CERRADO...)". Gate 6 iba a ser el último gate del plan, pero el líder del proyecto agregó **Gate 7** al cierre de esa sesión — ver `spec/PLAN_DESARROLLO.md` v1.4 para el exit criterio completo.

Lee antes de escribir código: `spec/PLAN_DESARROLLO.md` Gate 7 (sección "Gate 7 — Estilos visuales"), `apps/web/src/index.css` (los tokens `@theme` vigentes) y los componentes de `apps/web/src/shared/ui/` (`Button`, `Input`, `Select`, `Field`, `Card`, `Table`) — son el punto de partida real, no una pantalla individual.

No pidas confirmación entre pasos salvo que algo del spec sea ambiguo o contradiga lo que encuentres en el código — en ese caso, detente y pregunta, no asumas.

## Qué falta construir

Gate 7 es **solo visual** — nada de features nuevas, nada de cambios de comportamiento, de contrato o de lógica de negocio. Es una pasada de diseño hacia una estética minimalista sobre `apps/web` completo (pantallas de cliente **y** admin panel — comparten los mismos tokens/componentes, separarlas rompería la consistencia).

1. **Revisar los tokens de `@theme` en `apps/web/src/index.css`** (colores, tipografía) hacia el resultado minimalista: paleta reducida/neutra, jerarquía tipográfica clara, más espacio en blanco, menos decoración (bordes/sombras/color) que no aporte función. Sin introducir un sistema de diseño nuevo ni una librería de componentes — sigue siendo Tailwind puro (ADR-001/ADR-016 no se reabren).
2. **Los cambios fluyen desde `shared/ui` hacia afuera** — ajustar `Button`/`Input`/`Select`/`Field`/`Card`/`Table` primero; evitar overrides por pantalla que dupliquen algo que el componente compartido ya debería resolver (mismo principio "Shared Stylesheet First" de `CLAUDE.md`).
3. **Mantener el contraste AA y el `:focus-visible`** que Gate 6 dejó correctos y verificados con luminancia relativa real — un cambio de paleta que los rompa no es aceptable sin re-verificarlos con el mismo rigor.
4. **Verificación visual real en navegador es obligatoria para cerrar este gate** — usar las herramientas de Chrome (`mcp__claude-in-chrome__*`) para ver el resultado renderizado en las pantallas de cliente y admin antes de dar el gate por cerrado. Gate 6 dejó pendiente la verificación visual dos veces seguidas (accesibilidad y el formulario de deadline de `SlotsAdminPage.tsx`) por no tener Chrome conectado — no repetir eso acá, donde el resultado ES la verificación.
5. **Correr la suite completa** (`npm run test`, ver el README para el setup de la DB de test) para confirmar que ningún test existente dependía de una clase o de un texto que el rediseño cambie.

**Fuera de alcance explícito**: dark mode, animaciones/microinteracciones nuevas, rediseño de la estructura de información (layout de secciones, orden de campos) — si durante el trabajo parece que hace falta tocar eso para lograr el resultado minimalista, confirmar con el líder del proyecto antes, no asumir. Si aparece algo que parezca un bug de comportamiento (no solo visual) mientras se toca una pantalla, señalarlo aparte — no arreglarlo en silencio dentro de este gate.

## Checklist de cierre del gate — no te lo saltees

1. Verificación visual real en navegador (cliente y admin) — condición de cierre específica de este gate, no opcional.
2. `npm run test` verde en los 3 workspaces.
3. `/code-review` sobre el diff de este gate.
4. `advisor`.
5. Walkthrough en `spec/todo.md` (fecha del día).
6. Actualiza `spec/ESTADO_PLAN.md`: G7 pasa a "cerrado".
7. Si hay issues/milestone de GitHub para G7 (no existían al momento de escribir este prompt — confirmar si el usuario los creó), ciérralos/comentalos.
8. Detente.

## Contexto que ya no hace falta redecidir

- Todas las decisiones de ADR-001 a ADR-029 (`spec/DECISIONES_ARQUITECTURA.md`) — este gate no las reabre salvo contradicción real encontrada durante el trabajo.
- Stack de estilos: Tailwind v4 vía `@tailwindcss/vite`, sin `tailwind.config.js`, tokens en `@theme` dentro de `apps/web/src/index.css` (ADR-001/ADR-016).
- El sistema de componentes compartidos (`apps/web/src/shared/ui/`) ya existe y es el punto de apalancamiento correcto — no crear una carpeta de componentes paralela.
- Las credenciales/secrets van siempre por variables de entorno; ver el README para el setup local completo (verificado de punta a punta en la sesión de Gate 6).

**No hagas commit.** El usuario comitea siempre — deja el árbol de trabajo listo y dilo explícitamente al terminar.
