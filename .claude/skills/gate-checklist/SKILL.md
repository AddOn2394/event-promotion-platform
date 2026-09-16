---
name: gate-checklist
description: Verify the current gate's exit criteria from spec/PLAN_DESARROLLO.md are met, and confirm the mandatory closing sequence (tests → /code-review → advisor → walkthrough) before handing a gate off for commit.
---

# Gate checklist

This project closes work in gates (G0–G6), defined in `spec/PLAN_DESARROLLO.md`. A gate is **never** considered closed just because the code runs — it closes only through the exact sequence agreed with the project lead:

> tests pasan → `/code-review` sobre el diff → pase del advisor → walkthrough escrito → commit (commit lo hace siempre el líder del proyecto).

## What to do when invoked

1. **Identify the current gate.** Read `spec/PLAN_DESARROLLO.md` and `spec/ESTADO_PLAN.md` to find which gate is in progress (the first one not marked closed in the "Estado actual" table).
2. **Extract that gate's exit criteria verbatim** from its `## Gate N` section — do not paraphrase or add criteria that aren't written there, and do not silently drop any.
3. **Check each criterion against the actual code and tests**, not against intentions or partial progress. For each item, report one of: ✅ met, ⚠️ partially met (say what's missing), ❌ not started.
4. **Check the closing sequence separately** from the exit criteria — a gate can have all exit criteria met and still not be closeable:
   - Tests pass (run the relevant workspace's test script; don't assume from memory).
   - `/code-review` has been run on the diff since the last change (ask if unsure — don't assume this happened).
   - An `advisor` pass has been done on the completed work.
   - A written walkthrough exists (a message to the project lead summarizing what was built and why, not just a diff).
   - Nothing has been committed by the assistant — commits are the project lead's job, always (see `CLAUDE.md`).
5. **Report a clear verdict**: "Gate N is ready to close — hand off for commit" or "Gate N is NOT ready — missing: [list]". Never declare a gate closed yourself; only the project lead does that by committing.

## Boundaries

- Do not invent exit criteria beyond what `spec/PLAN_DESARROLLO.md` states for the gate in question — if something feels missing from the spec, flag it as a question to raise with the project lead (per `CLAUDE.md`'s rule against silent judgment calls on business logic), don't add it unilaterally.
- Do not commit, even if every criterion is met.
