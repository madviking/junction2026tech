Status: draft
Last reviewed: 2026-11-13

# Architecture

The product is not chosen yet; this describes the scaffold every idea starts from.

```text
browser ──> frontend (Vite dev :5300 / nginx in production)
              │  /api/*  (proxied)
              ▼
            backend (FastAPI :8300)
              ├── app/<module>/   router → service → repository
              ├── app/llm/        the only provider boundary ──> OpenRouter / OpenAI / mistral vLLM
              ├── PostgreSQL :5434 (durable product data, llm_usage)
              └── Redis :6381     (ephemeral, TTL-based cache/state only)
```

## Boundaries

- **API contract.** FastAPI generates `contracts/openapi.json` (`make api`);
  `openapi-typescript` turns it into `frontend/src/shared/api/generated/openapi.ts`.
  The readiness gate fails when either is stale. If the backend moves to Encore,
  the contract file stays the hand-off point.
- **Database.** `db/migrations/<n>_<name>.up.sql`, applied by the `migrations`
  container (`migrate/migrate`). The numbering and file format match Encore's
  `sqldb` migrations, so the same files work after a move.
- **LLM.** Feature code asks `app.llm` for a completion by feature key. Provider,
  model, fallback and parameters come from `backend/app/llm/integrations/<key>.yaml`;
  prompts from `backend/app/prompts/<name>.txt`; every attempt writes an
  `llm_usage` row. Details: `backend/app/llm/README.md`.
- **Frontend.** Features under `src/features/<name>/` import only from themselves
  and `src/shared/`. Composition (routing, shell) lives in `src/app/`.

## Storage

| Store | Use for | Never for |
| --- | --- | --- |
| PostgreSQL (`postgres_data` volume) | Everything the product must remember | Throwaway caches |
| Redis (`redis_data` volume, AOF on) | Caches, rate limits, short-lived job state with TTLs | Source of truth |
| Bucket storage (not provisioned yet) | User uploads, generated media | — |
| Browser storage | UI conveniences (last tab, draft text) | Product data |

`docker compose down` keeps the volumes; `docker compose down -v` deletes all
local data. Ask before running the latter on someone else's machine.

## Local runtime

- `make up` starts PostgreSQL, Redis and runs migrations.
- Run the backend and frontend on the host for fast reload (`make dev-backend`,
  `make dev-frontend`), or everything in containers with `make up-all`.
