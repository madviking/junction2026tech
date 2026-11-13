# Junction 2026 — tech

Our hackathon build. The idea is not chosen yet; this repository is the scaffold:
FastAPI backend, React + Mantine frontend, PostgreSQL + Redis in Docker, a shared
LLM layer, and the agent rules and readiness gate we use on our other products.

**Agents and humans: start with [`AGENTS.md`](AGENTS.md).**

## Quickstart

Needs Docker, [`uv`](https://docs.astral.sh/uv/) and Node 24.

```bash
make setup          # .env from .env.example, uv sync, npm ci
make up             # PostgreSQL :5434 + Redis :6381 + migrations
make dev-backend    # http://localhost:8300  (API under /api, docs at /docs)
make dev-frontend   # http://localhost:5300
```

Add `OPEN_ROUTER_API_KEY` to `.env`, then `make llm-smoke` makes one tiny paid
call through the shared LLM layer and prints its tokens and cost.

Everything in containers instead: `make up-all`. Stop with `make down` (data
volumes are kept).

## Daily loop

```bash
make api                          # after backend route/schema changes: contract + TS types
bash dev_readiness_check.sh       # before saying "done" (scoped to changed files)
make ready                        # full gate (CI runs this on every PR)
```

## Where things are

| | |
| --- | --- |
| Rules, routing, verification | `AGENTS.md`, `.codex/skills/` |
| Backend | `backend/` (`backend/README.md`) |
| Frontend | `frontend/` (`frontend/README.md`) |
| SQL migrations | `db/migrations/` |
| API contract | `contracts/openapi.json` |
| Architecture, deployment, decisions | `docs/` |
