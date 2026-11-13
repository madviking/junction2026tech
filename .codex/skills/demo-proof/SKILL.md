---
name: demo-proof
description: Use when a change affects a user-visible flow, the demo path, or when the user asks whether something works. Keeps acceptance tied to the running app, every requested item and honest proof levels.
---

# Demo Proof

The demo is the product. A flow is accepted only when it works in the running
app with real backend data, not when unit tests pass.

## Proof levels (always say which one you reached)

1. `unit`: targeted tests pass.
2. `local-api`: real request against the locally running backend and database.
3. `local-ui`: the flow clicked through in the running frontend against the real
   local backend, including a reload to show the result persisted.
4. `deployed`: the same on the deployed URL.

Report the highest level actually observed, with the command or steps and the
evidence (response excerpt, screenshot path). Never claim a level you did not run.

## Requirement-by-requirement closure

For any request with several items (including sub-items and duplicated numbers),
keep an acceptance matrix (`docs/planning/_template.md`): requirement,
implementation paths, automated check, observed evidence, status. Before the final
report, re-read the original request and compare it with what the app does now.
An omitted, blocked or unproved row must be listed as such; it blocks a "done".

A teammate's reproducible counter-example reopens the item.

## Demo path hygiene

- Keep a short, current list of demo steps in the product section of
  `AGENTS.md` once the idea is chosen.
- Seed data for the demo is synthetic and clearly marked; it lives in a
  migration or a seed script, never hand-edited rows.
- The demo must not depend on a single fragile external call: have a cached or
  fallback result for anything slow or rate-limited (LLM, third-party APIs).
- Check the demo path after every merge to the shared branch, not only at the end.
