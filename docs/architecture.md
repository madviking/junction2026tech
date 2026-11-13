Status: draft
Last reviewed: 2026-11-14

# Architecture

```text
browser ──> frontend (Vite dev :5300; static build when deployed)
              │  /api/*  through the generated client
              ▼
            backend (Encore.ts :8300; Docker image when deployed)
              ├── <service>/   endpoint → service.ts → repository.ts
              ├── llm/         the only provider boundary ──> Gemini
              └── PostgreSQL "silta" + pgvector
                    local: Encore's own container
                    cloud: Aiven for PostgreSQL, same region as the app
```

## Boundaries

- **API contract.** The Encore app is the contract. `make api` runs
  `encore gen client` into `frontend/src/shared/api/client.ts`; the readiness
  gate fails when that file is stale.
- **Database.** `backend/db/migrations/<n>_<name>.up.sql`. Encore applies them
  locally and in tests; against Aiven they are applied with golang-migrate
  (`make migrate-aiven`) because the self-hosted image does not migrate.
- **LLM.** Services ask `llm.complete` for a completion by feature key. The
  model comes from `backend/llm/integrations.ts`; every attempt writes an
  `llm_usage` row. Details: `backend/llm/README.md`.
- **Frontend.** Features under `src/features/<name>/` import only from
  themselves and `src/shared/`. Composition (routing, shell) lives in `src/app/`.

## Storage

| Store | Use for | Never for |
| --- | --- | --- |
| PostgreSQL | Everything the product must remember, embeddings (pgvector), small audio clips (`bytea`) | Throwaway caches |
| Browser storage | UI conveniences (last tab, draft text) | Product data |

No Redis, Kafka or object storage until a feature needs one (then an Aiven
service or an Encore `Bucket`).

## Local runtime

`make dev-backend` and `make dev-frontend`. Encore owns the local database;
`encore db reset silta` wipes it.
