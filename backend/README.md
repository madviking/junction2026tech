# backend

Thin FastAPI scaffold (Python ≥ 3.11, managed with `uv`). Kept deliberately small
because we may move to Encore: see `docs/decisions/0001-backend-runtime.md`.

## Run

```bash
make up            # from repo root: PostgreSQL + Redis + migrations
make dev-backend   # uvicorn with reload on http://localhost:8300
```

Or directly: `cd backend && uv sync && uv run uvicorn app.main:app --reload --port 8300`.

## Layout

```text
app/
  main.py          create_app(): registers module routers under /api
  config.py        Settings (reads repo-root .env); use get_settings()
  core/            shared infrastructure (db connection)
  health/          reference module: router → service → repository
  llm/             the only LLM provider boundary (+ integrations/*.yaml)
  prompts/         prompt templates (templates/*.txt) and render_prompt()
scripts/export_openapi.py
tests/<module>/    pytest; tests/conftest.py has the real-DB `db_conn` fixture
```

New module: copy `app/health/` (README, router, schemas, service, repository),
register its router in `main.py`, add tests under `tests/<module>/`, then
`make api` to refresh the contract and frontend types.

## Checks

```bash
uv run ruff check . && uv run ruff format --check .
uv run pytest -q
```

Ruff also blocks `print` in app code (use `logging`), broad `except`, and common
security mistakes (bandit rules). DB tests skip when PostgreSQL is not running.
