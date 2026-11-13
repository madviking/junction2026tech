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
llm/                   the only LLM provider boundary (Gemini) + llm_usage
voice/ content/ flows/ cards/ regions/ visits/ admin/    skeletons
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

```bash
encore secret set --type local,dev GeminiApiKey
encore secret set --type local,dev ElevenLabsApiKey
```

You type the value; never print, log or commit it. In the self-hosted image they
come from environment variables mapped in `infra.config.json` (`GEMINI_API_KEY`;
add a mapping there when a service declares a new secret).

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
