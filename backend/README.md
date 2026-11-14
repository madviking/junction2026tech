# backend

Encore.ts app (`encore.dev` pinned in `package.json`; keep the CLI on the same
version). Why: `docs/decisions/0002-encore-ts-on-aiven.md`.

## Run

```bash
npm ci
encore run --port 8300     # or `make dev-backend` from the repo root
```

- API: `http://localhost:8300/api/...`; dev dashboard with traces: `http://localhost:9400`.
- Encore starts a local PostgreSQL (with pgvector) in Docker and applies
  `db/migrations`. `encore db shell silta` opens psql.

## Layout

```text
encore.app             app config, CORS origins
infra.config.json      self-hosting config for the Docker image (Aiven)
db/                    SQLDatabase "silta" + migrations, shared by all services
health/                reference service: GET /api/health
care_paths/            content model, journey engine, care-path composition (+ seed files)
content/               versioned content document: live bundle, drafts, publish, rollback, export
visits/                anonymous visit codes, journey event log, clinician summary, next steps
regions/               county figures (Helsinki) + anonymous counts
service_paths/         service paths by area: doors, stages, screening, measured waits, compare (+ seed)
letters/               photo of a letter -> explanation in the resident's language (llm.extract); stores nothing
cards/                 free text / transcript -> card (llm.decide), with guard rails
voice/                 ElevenLabs text-to-speech and speech-to-text, audio storage
llm/                   the only LLM provider boundary (OpenRouter, Gemini) + llm_usage
admin/                 auth handler, admin sign-in, audit log
lib/                   plain shared helpers (requireAdmin)
flows/                 skeleton (superseded by the journey in care_paths; kept empty)
app/, tests/           the original Python care_paths module, superseded by care_paths/
```

A service is a folder with `encore.service.ts`:

```text
<name>.ts          endpoints (api(...)): parse, call the service, nothing else
service.ts         rules; no SQL
repository.ts      SQL only, through SQLDatabase.named('silta') and the sql template
<name>.test.ts     vitest, run by `encore test`
README.md          purpose, endpoints, tables it owns
```

Public endpoints live under `/api/<service>/...` with `expose: true`.
Service-to-service calls go through `~encore/clients`.

## Secrets

The app is not linked to the Encore Platform, so `encore secret set` does not work.
Local secrets live in `backend/.secrets.local.cue` (gitignored), generated from `.env`
without printing values:

```text
GeminiApiKey: "..."        # from GEMINI_API_KEY
OpenRouterApiKey: "..."    # from OPEN_ROUTER_API_KEY
ElevenLabsApiKey: "..."    # from ELEVEN_LABS_API_KEY
```

Never print, log or commit them. In the self-hosted image they
come from environment variables mapped in `infra.config.json` (`GEMINI_API_KEY`,
`OPEN_ROUTER_API_KEY`, `ELEVEN_LABS_API_KEY`; add a mapping there when a service declares a new secret).

## Checks

```bash
npm run typecheck
encore test                 # all services, against Encore's test database
encore test health          # one service
```

After an endpoint or type change: `make api` (regenerates
`frontend/src/shared/api/client.ts`). `.encore/manifest.json` is committed on
purpose: its `local_id` ends up in the generated client, so it must match on
every machine and in CI.

## Build and run against Aiven

```bash
make image           # encore build docker --config infra.config.json silta-api:dev
make migrate-aiven   # the image does NOT migrate; apply db/migrations first
make run-image       # serves :8300 using .env, then: curl localhost:8300/api/health
```

`.env` needs `AIVEN_PG_PASSWORD` and `GEMINI_API_KEY` (`.env.example`); the
targets run `scripts/aiven.py`. The database host and CA certificate are in
`infra.config.json`. Deployment and the CI pipeline: `docs/deployment.md`.
