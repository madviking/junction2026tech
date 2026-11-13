---
name: task-sizing-workflow
description: Use first for every task. Classifies scope and keeps discovery, planning and verification proportional to the task so hackathon time goes into the demo.
---

# Task Sizing Workflow

Use this before reading broad docs or loading other skills.

## Report the size

State the size and a model recommendation before substantive work:

```text
Task size: <size>
Recommended model: <tier>
```

Advisory only; do not try to verify which model is active. Then continue.

## Sizes

- `bug fix`: existing behavior is wrong in a known place.
  Read: `AGENTS.md`, nearest module `README.md`, touched files, closest tests.
  Budget before first action: 5 file reads, 2 searches. No plan doc.
- `minor change`: extend or adjust behavior inside one module or one UI/API path.
  Budget: 8 reads, 3 searches. No plan doc.
- `new feature`: a bounded capability that may cross backend, frontend and schema.
  Budget: 12 reads, 5 searches, limited to touched modules.
  Plan doc in `docs/planning/` when it crosses modules or will be split between
  people or agents.
- `big feature / refactor`: changes shared architecture, contracts, tooling or
  several modules. Write or update the plan doc first (with file slices and the
  acceptance matrix), then work slice by slice.

"First action" means a failing test, a minimal patch, or one genuinely blocking
question. When the budget is spent, take one of those or explicitly reclassify;
do not keep exploring.

## Decision rules

- Pick the smallest size that honestly fits the blast radius.
- If the target module is known, stay inside it.
- Doc-only work inside one module is a `minor change`.
- In a hackathon, a hack that is clearly marked (`# HACK(demo): ...`) and
  isolated beats a general abstraction nobody will reuse. It must still pass the
  readiness gate and must not break a hard rule in `AGENTS.md`.

## Prompt requests

When the user asks for a prompt, do not do the task. Return:

```text
Task size: <size>
Why: <one sentence>

Prompt:
<ready-to-paste prompt: scope, constraints, target paths, verification, definition of done>
```

## Next step

- `bug fix` / `minor change` / `new feature`: `.codex/skills/module-discovery-reuse/SKILL.md`.
- `big feature / refactor`: plan doc, then module discovery per slice.
- Always finish with `.codex/skills/readiness-gate/SKILL.md`.
