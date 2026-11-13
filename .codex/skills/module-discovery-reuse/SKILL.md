---
name: module-discovery-reuse
description: Default implementation skill. Keeps context local by reading the nearest module README, the exact files and their tests, and reusing existing patterns before any broader scan.
---

# Module Discovery + Reuse

Use after task sizing for implementation work.

## Local-first read order

1. Identify the primary module from the request or the touched path
   (`backend/<service>/`, `frontend/src/features/<name>/`, `backend/db/migrations/`).
2. Read that module's `README.md`.
3. Read the exact implementation files and the closest tests.
4. Search inside the same module for an existing pattern.
5. Only then look at shared code the path already uses
   (`backend/db/`, `backend/llm/`, `frontend/src/shared/`).

## Reuse checklist

- Reuse the router → service → repository shape already in the module.
- Reuse generated API types; never redeclare request/response shapes.
- Reuse shared UI from `frontend/src/shared/` before writing a new component;
  if the shared owner lacks a capability, extend the owner.
- Reuse the closest test as the template for the new failing test.
- LLM work goes through `backend/llm/`; check its README first.

## New module

When nothing fits, create the module with its `README.md` first: purpose, public
surface (routes, components), data it owns, how to test it. The readiness gate
fails on a backend module or frontend feature without a README.

## Stop conditions

- Do not scan unrelated modules "for context".
- Do not read `docs/` unless the module README or a skill points there.
- After the first pass, either name the patch location, add the failing test, or
  state the single open question that justifies reading more.

## Progress updates

Only on phase changes (target found, failing test added, edit starting,
verification result), one or two sentences each.
