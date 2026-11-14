Status: draft
Last reviewed: 2026-11-14

# Architecture

```text
browser ──> frontend (Vite dev :5300; static build when deployed)
              │  /api/*  through the generated client
              ▼
            backend (Encore.ts :8300; Docker image when deployed)
              ├── <service>/   endpoint → service.ts → repository.ts
              ├── care_paths/  content model, journey engine, compose (pure domain)
              ├── content/     versioned content document (draft, publish, rollback, export)
              ├── visits/      anonymous visit codes + journey event log, clinician summary
              ├── regions/     county figures + anonymous counts
              ├── cards/       free text / transcript → card (llm.decide)
              ├── voice/       the only ElevenLabs boundary (TTS, STT, audio_blobs)
              ├── llm/         the only LLM boundary ──> OpenRouter, Gemini
              ├── admin/       auth handler, sign-in, audit
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
- **LLM.** Services ask `llm.complete` (text) or `llm.decide` (closed-set choice with
  probabilities) by feature key. Provider and model come from
  `backend/llm/integrations.ts`; every attempt writes an `llm_usage` row with cost.
  Details: `backend/llm/README.md`.
- **Content.** One versioned document (`docs/decisions/0003-versioned-content-document.md`);
  residents only see the published version. All resident text goes through the frontend
  i18n layer (`frontend/src/shared/i18n`).
- **Auth.** Admin endpoints use the Encore auth handler in `backend/admin`; resident,
  clinician and county endpoints are anonymous.
- **Frontend.** Features under `src/features/<name>/` import other features only through
  their public `index.ts`, and everything visual from `src/shared/ui` (lint-enforced).
  Two shells: resident (anonymous, mobile first) and admin (lazy-loaded, signed in).
  Composition (routing, shells) lives in `src/app/`.

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
