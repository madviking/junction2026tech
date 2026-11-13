---
name: backend-module-architecture
description: Use when changing backend code, routes, schema, migrations or workers. Keeps the router/service/repository split, migration discipline, contract regeneration and targeted backend testing.
---

# Backend Module Architecture

Read `backend/README.md` once, then only the touched module's `README.md`, files
and tests.

## Module shape

```text
backend/app/<module>/
  README.md        purpose, routes, tables it owns, how to test
  router.py        HTTP only: parse, call service, map errors to status codes
  schemas.py       Pydantic request/response models (become the OpenAPI contract)
  service.py       business rules; no SQL, no HTTP
  repository.py    SQL only (psycopg, parameterized queries)
backend/tests/<module>/test_*.py
```

Register the router in `backend/app/main.py`. Routes live under `/api`.

## Hard rules

- Routers never touch the database; services never contain SQL.
- Parameterized SQL only (`%s` placeholders). Never format values into SQL text.
- Every schema change is a new `db/migrations/<n+1>_<name>.up.sql`. Applied
  migrations are never edited.
- Outbound HTTP always sets a timeout. LLM providers are reached only through
  `backend/app/llm/` (`.codex/skills/llm-integration/SKILL.md`).
- No broad `except Exception: pass`. Log with context and re-raise or return a
  clear error.
- Config comes from `app.config.get_settings()`, never from scattered `os.getenv`.
- Python files stay under 500 lines; split by responsibility before that.

## Workflow

1. Find the closest test; write the failing test first.
2. Implement the smallest change.
3. Migration needed? Add it, then `make migrate` and rerun tests against the
   local database.
4. Route or schema changed? `make api` to regenerate `contracts/openapi.json` and
   the frontend types, and fix frontend type errors it reveals.
5. `bash dev_readiness_check.sh` (add `--all` when shared code changed).

## Tests

- `cd backend && uv run pytest -q tests/<module>` for the targeted run.
- Tests that need PostgreSQL use the `db_conn` fixture in `tests/conftest.py`;
  they skip with a clear message when the database is not up (`make up`).
- Mock only third-party network boundaries (LLM providers, external APIs), never
  our own services or repositories.
