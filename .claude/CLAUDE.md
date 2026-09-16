You are an expert in TypeScript, React, and Node.js/Express, building a monorepo (`apps/web`, `apps/api`, `packages/shared-types`). You write functional, maintainable, SOLID code that follows the project's spec exactly — see `spec/` before implementing anything.

## Spec-driven workflow (read this first)

- `spec/DECISIONES_ARQUITECTURA.md` (ADRs), `spec/SPEC_FUNCIONAL.md` (roles, historias de usuario, modelo de datos), `spec/PLAN_DESARROLLO.md` (gates) are the source of truth. Do not deviate from them without raising it explicitly and getting it ratified into an ADR — never implement a silent judgment call on business logic (discount rules, capacity, deadlines, auth).
- Every gate closes with: tests pass → `/code-review` on the diff → advisor pass → written walkthrough → commit (by the project lead only — never run `git commit` in this repo).
- Prioritize correctness and SOLID/clean-code over speed. Small functions, explicit names, no clever abstractions that need a comment to explain — the project lead needs to read and understand every line.

## TypeScript

- Strict type checking (already enabled in `tsconfig.base.json`).
- Prefer type inference when the type is obvious; avoid `any`, use `unknown` when uncertain.
- Zod schemas are the source of truth for the API contract and live in `packages/shared-types` (ADR-003) — never duplicate a schema's shape by hand in `apps/web` or `apps/api`; import it.

## React (`apps/web`)

- Functional components only, no class components.
- `react-hook-form` + the shared Zod schema (via `@hookform/resolvers/zod`) for every form — never hand-roll validation that a schema already expresses (ADR-016).
- `@tanstack/react-query` for all server state (fetching catalog, slots, confirmations, admin data) — no manual `useEffect` + `useState` data-fetching.
- Feature-first folder structure, one folder per business domain (e.g. `registration/`, `admin/`), each with its own `components/`, `pages/`, `api/` (query hooks), `types/` — mirrors the Tesloshop reference's organization philosophy, not its framework.
- Basic accessibility on every form/screen: labels associated with inputs, visible focus states, sufficient color contrast, full keyboard navigation. This is not a full AXE audit (see `spec/PLAN_DESARROLLO.md` Gate 6) — don't add tooling for that.
- Client-side validation previews (e.g. discount %) are UX only — the server always recomputes authoritatively; never treat a client-computed value as final.

## Node/Express (`apps/api`)

- Feature-first structure: `src/<dominio>/routes.ts` + `controller.ts` + `service.ts` per domain (registration, catalog, slots, auth, admin) — no domain logic inside route handlers.
- Every request/response validated against the shared Zod schema from `packages/shared-types` — reject at the boundary, don't trust the client.
- Business rules with more than one scenario (e.g. the discount engine, ADR-023) are implemented as a list of rule objects (predicate + result), evaluated in a fixed order — adding a new scenario means adding a rule object, never editing the existing evaluator (open/closed).
- Money is always integer cents, never `float`. Boundary comparisons (e.g. `> 150000` cents) must be exact — see the boundary test table in `spec/SPEC_FUNCIONAL.md` HU-3.
- Anything touching capacity/slots (ADR-009) or a unique-per-invitation confirmation (ADR-011) runs inside a single DB transaction with the exact conditional `UPDATE ... WHERE ... > 0` pattern the spec describes — never a read-then-write with a gap between them.

## Testing

- Business logic (discount engine, capacity, deadline) gets exhaustive unit tests, including exact boundary values.
- API endpoints get integration tests against a real test database — no mocked DB for anything touching a transaction or a constraint.
- No UI e2e suite in this project (ADR-017) — don't add Playwright/Cypress.

## General

- Don't add features, abstractions, or config beyond what the current gate (`spec/PLAN_DESARROLLO.md`) asks for.
- Default to no code comments; when one is warranted, it explains a non-obvious *why*, never a *what* the code already says.
