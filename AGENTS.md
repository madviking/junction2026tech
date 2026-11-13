Status: active
Last reviewed: 2026-11-13

# Junction 2026 — Agent Guide

This is the entry point for every coding agent (Codex, Claude, others) working in
this repository. Keep it lean: it routes work and names the hard rules. Procedures
live in `.codex/skills/`, module `README.md` files and `docs/`.

## What this project is

Our Junction 2026 hackathon build. **The product is not decided yet.** Until it
is, treat the code as scaffolding: a thin Python/FastAPI backend, a React +
Mantine frontend, PostgreSQL + Redis in Docker, and a shared LLM layer. We may
move the backend onto Encore (Go); see `docs/decisions/0001-backend-runtime.md`.
When the idea is chosen, replace this section with a three-sentence product
statement and the demo path judges will see.

Time is the scarcest resource. Prefer the smallest change that makes the demo
path work end to end over generality. Every rule below exists because skipping it
cost us more time than it saved.

## Start narrow

1. Classify the task with `.codex/skills/task-sizing-workflow/SKILL.md` and state
   the size before substantive work.
2. For implementation, follow `.codex/skills/module-discovery-reuse/SKILL.md`:
   nearest module `README.md`, the exact files and their tests, then act.
3. Load stack skills only when the touched area needs them (routing below).
4. Ignore unrelated dirty files from teammates or other agents. If they break a
   check, report it; do not fix, revert or reformat them.

Before planning implementation, apply this filter:

1. Does this need to exist for the demo?
2. Is it already in this codebase?
3. Does the standard library or the platform do it?
4. Is an installed dependency the right fit?
5. Only then build the minimum that works.

## Repository map

| Path | Owns |
| --- | --- |
| `backend/` | FastAPI app (`backend/app/<module>/`), tests, Dockerfile. See `backend/README.md`. |
| `backend/app/llm/` | The only place that talks to LLM providers. |
| `frontend/` | Vite + React + Mantine SPA. Features in `frontend/src/features/<name>/`, shared code in `frontend/src/shared/`. |
| `db/migrations/` | Plain SQL migrations (`<n>_<name>.up.sql`), Encore-compatible. |
| `contracts/openapi.json` | Generated API contract; the frontend types come from it. |
| `docs/` | Cross-cutting docs, decisions and plans. See `docs/README.md`. |
| `scripts/` | Repo tooling (policy checks, contract export). |
| `compose.yaml` | Local Docker: data services by default, app containers under the `app` profile. |
| `compose.production.yaml` | Production runtime contract handed to East Deploy. |

Local ports: backend `8300`, frontend `5300`, PostgreSQL `5434`, Redis `6381`.
They deliberately avoid Queast, Encore and the shared East dev containers.

## Hard rules

- **Git.** Read-only inspection is always fine. Commit, push, branch, stash,
  reset, checkout and every other state-changing command need the user's explicit
  approval for that exact action. `.claude/settings.json` denies them for Claude.
- **Secrets.** Never commit, print, log or paste secrets. Real values live in
  `.env` (gitignored); `.env.example` holds names and safe local defaults only.
  The policy check scans for provider key patterns.
- **Tests.** TDD for executable behavior: failing test first, minimal change,
  rerun the targeted test. Do not mock our own production code paths; mock only
  third-party network boundaries.
- **Architecture.** Routers stay thin, services own the rules, repositories own
  SQL. No SQL in routers or services.
- **Schema.** Every schema change is a new forward migration in `db/migrations/`.
  Never edit a migration that has been applied anywhere shared.
- **Contracts.** The backend owns the API contract. After a route or schema
  change run `make api`; the frontend imports types from
  `frontend/src/shared/api/generated/openapi.ts` and never hand-writes request or
  response types.
- **Persistence.** Product data lives in PostgreSQL, not browser storage. Redis is
  for ephemeral, TTL-based state only. User files go to bucket storage, never to a
  local filesystem path inside a container.
- **LLM calls.** Only through `backend/app/llm/` (`.codex/skills/llm-integration/SKILL.md`).
  No provider URLs, SDKs or model IDs in feature code; models come from
  `backend/app/llm/integrations/<feature>.yaml`, prompts from
  `backend/app/prompts/`. Every call records a usage row with its feature name.
- **Paid LLM spend.** Estimate cost (cases × tokens × price) before any batch,
  eval or comparison run. At most 2 € estimated: proceed and report actual spend.
  Above 2 €: stop and ask with the estimate. Never loop paid calls to get a green
  test.
- **Dependencies.** Pin exact versions. Before adding npm packages run
  `npm audit` and review high/critical advisories; use `npm ci` for installs.
  Never `npm audit fix --force` without approval.
- **Production.** Deployment goes through East Deploy (`docs/deployment.md`).
  Never change a server, a production database or a live provider account
  without explicit approval for that exact action and target.
- **Proof.** Report what actually ran and at which level (unit, local app,
  browser, deployed). Never write "this should work".

## Task routing

- Docs, `AGENTS.md`, skills: `.codex/skills/docs-standards/SKILL.md`
- Backend code, schema, workers: `.codex/skills/backend-module-architecture/SKILL.md`
- Frontend UI, hooks, routing, contracts: `.codex/skills/frontend-standards/SKILL.md`
- Anything that calls an LLM: `.codex/skills/llm-integration/SKILL.md`
- Default verification: `.codex/skills/readiness-gate/SKILL.md`
- Demo flows and acceptance of user-visible behavior: `.codex/skills/demo-proof/SKILL.md`

For bigger tasks act as an operator: split the work into slices with separate
file ownership, use subagents for parallel investigation when the user or this
guide allows it, then personally review the result and run final verification.
Two agents never edit the same files at the same time.

## Documentation

- Future-developer context goes in the nearest module `README.md`. Every backend
  module and every frontend feature has one.
- Cross-cutting docs live under `docs/` and start with `Status:` and
  `Last reviewed:` lines.
- Plans for work that crosses modules or spans sessions go under `docs/planning/`
  using `docs/planning/_template.md`, and stay current while the work is active.
- Decisions that would surprise a teammate go in `docs/decisions/`.
- Delete obsolete docs instead of leaving competing truths.

## Verification

- Run targeted tests first.
- Before reporting done: `bash dev_readiness_check.sh` (scoped to changed files).
  Use `--all` after shared, tooling or contract changes.
- Frontend changes are not done until `npm run build` passes (the gate runs it)
  and the changed screen was checked in the running app.
- For enumerated requests, track every item to implementation and evidence;
  an unproved item blocks a full-completion claim.
- Keep final reports compact: commands run, pass/fail, blockers.
