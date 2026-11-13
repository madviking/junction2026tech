# Silta — tech

Our Junction 2026 build: a multilingual, mobile-first web app that helps language
minorities in Finland act on possible cancer symptoms and use screening.
Encore.ts backend, React + Mantine frontend, PostgreSQL with pgvector (local
through Encore, Aiven for PostgreSQL in the cloud).

**Agents and humans: start with [`AGENTS.md`](AGENTS.md).**

## Quickstart

Needs Docker, Node 24 and the [Encore CLI](https://encore.dev/docs/ts/install).

```bash
make setup          # .env from .env.example, npm ci in backend/ and frontend/
make dev-backend    # http://localhost:8300 (API under /api), dev dashboard http://localhost:9400
make dev-frontend   # http://localhost:5300
```

`encore run` starts its own PostgreSQL and applies `backend/db/migrations`; there
is nothing else to start.

## Daily loop

```bash
make api                          # after endpoint/type changes: regenerate the frontend client
bash dev_readiness_check.sh       # before saying "done" (scoped to changed files)
make ready                        # full gate (CI runs this on every PR)
```

## Where things are

| | |
| --- | --- |
| Rules, routing, verification | `AGENTS.md`, `.codex/skills/` |
| Backend services | `backend/` (`backend/README.md`) |
| SQL migrations | `backend/db/migrations/` |
| Frontend | `frontend/` (`frontend/README.md`) |
| Generated API client | `frontend/src/shared/api/client.ts` |
| Architecture, deployment, decisions | `docs/` |
