---
name: backend-module-architecture
description: Use when changing backend code, endpoints, schema or migrations. Keeps the Encore service shape (endpoint/service/repository), migration discipline, client regeneration and targeted backend testing.
---

# Backend Module Architecture

Read `backend/README.md` once, then only the touched service's `README.md`, files
and tests.

## Service shape

```text
backend/<service>/
  encore.service.ts  declares the service
  README.md          purpose, endpoints, tables it owns, how to test
  <service>.ts       endpoints (api(...)): parse, call service.ts, nothing else
  service.ts         business rules and types; no SQL
  repository.ts      SQL only (SQLDatabase.named('silta'), sql tagged template)
  <service>.test.ts  vitest, run by `encore test`
```

Public endpoints: `expose: true`, path under `/api/<service>/`. Internal ones:
`expose: false`, called through `~encore/clients`.

## Hard rules

- Endpoints never touch the database; `service.ts` never contains SQL.
- SQL only through the tagged template (`db.query\`...${value}\``). Never build
  SQL text from values.
- Every schema change is a new `backend/db/migrations/<n+1>_<name>.up.sql`.
  Applied migrations are never edited.
- Outbound HTTP always sets a timeout. LLM providers are reached only through
  the `llm` service (`.codex/skills/llm-integration/SKILL.md`).
- No empty `catch`. Log with context (`encore.dev/log`) and rethrow or return an
  `APIError`.
- Secrets through `secret("Name")` from `encore.dev/config`, never `process.env`.
- TypeScript files stay under 400 lines; split by responsibility before that.

## Workflow

1. Find the closest test; write the failing test first.
2. Implement the smallest change.
3. Migration needed? Add it; `encore run` and `encore test` apply it locally.
4. Endpoint or type changed? `make api` to regenerate the frontend client, and
   fix the frontend type errors it reveals.
5. `bash dev_readiness_check.sh` (add `--all` when shared code changed).

## Tests

- `cd backend && encore test <service>` for the targeted run. Tests use Encore's
  test database with all migrations applied.
- Mock only third-party network boundaries (stub `fetch` for LLM providers and
  external APIs), never our own services or repositories.
