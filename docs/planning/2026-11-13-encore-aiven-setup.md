Status: draft
Last reviewed: 2026-11-14

# Encore.ts backend on Aiven: setup brief

Brief for the agent and person setting up the backend (Timo). Product context:
**Silta**, a multilingual, mobile-first web app that helps language minorities in
Finland act on possible cancer symptoms and use screening (AstraZeneca "Equal Care
Across Finland"). Concept and architecture live in the brain repo:
`junction2026/brain/ideas/silta.md` and `brain/ideas/silta-architecture.md`
(sections 4–5b).

## Goal

`encore run` serves the Silta API locally on Encore.ts with a local Postgres +
pgvector. The same code runs as a Docker image against **Aiven for PostgreSQL**,
in the same cloud region as the app host. The frontend calls it through a
generated TypeScript client.

## Decisions already made (do not re-open)

- **Backend:** Encore.ts (TypeScript), replacing the thin FastAPI scaffold. This
  supersedes `docs/decisions/0001-backend-runtime.md`; write `0002` (step 9).
- **Database:** Aiven for PostgreSQL with pgvector. Aiven also runs a tech-challenge
  prize ("meaningful use" is 40% of its score).
- **Latency rule:** the app and the database run in the **same cloud and region**.
  - Plan A: app on Aiven Runtime, next to the database.
  - Plan B: Cloud Run or another container host in the same region as the
    Aiven service.
  Never put the app in one region and the database in another (see brain
  `silta-architecture.md` 5b).
- **Self-host, not Encore Cloud.** Encore Cloud provisions its own database, so
  we build with `encore build docker` and point an infra config at Aiven.

## Scope

- **In:**
  - Encore app in `backend/`.
  - One shared database `silta` with pgvector.
  - Health endpoint, secrets, CORS, the generated client.
  - Aiven project and Postgres service.
  - `infra.config.json`, the Docker build, migrations against Aiven.
  - A first deploy if Runtime access is confirmed.
- **Out:**
  - Product modules beyond skeletons.
  - The frontend framework switch: Next.js vs the current Vite + Mantine is
    still open. The generated client works with either.
  - Kafka, Valkey and other Aiven services until a feature needs them.

## Owners and file slices

| Slice | Owner | Paths |
| --- | --- | --- |
| Encore app, services, migrations | Timo + backend agent | `backend/**`, `db/migrations/**` (moved, see step 4) |
| Tooling | backend agent | `Makefile`, `.claude/launch.json`, `compose*.yaml`, `.github/workflows/*`, `dev_readiness_check.sh`, `.env.example` |
| Aiven console | Timo (browser) + agent assisting | none in the repo, except `backend/infra.config.json` |
| Frontend client wiring | Mea | `frontend/src/shared/api/**` |

## Step by step

### 0. Preconditions
- Docker Desktop is running. `encore run` starts its own local Postgres container.
- **Installing the Encore CLI is a global tooling install, so ask Timo first.**
  ```bash
  brew install encoredev/tap/encore
  ```
  Then check it with `encore version`.
- Node 24 and npm are present. The repo pins exact dependency versions and uses
  `npm ci`.

### 1. Create the Encore app in `backend/`
- **Don't delete the Python package yet.** Build the Encore app beside it, reach
  parity (health + `llm_usage`), then remove it in one change with Timo's OK.
- Create the app with a TypeScript empty template:
  - Use `encore app create silta --example=ts/empty` in a temp folder and move
    the files in, or `encore app init` inside `backend/`.
  - If the CLI offers to link to Encore Cloud, skip it. If it insists, a free
    account is fine; it only supplies an app ID.
- You should end up with:
  - `backend/encore.app`
  - `backend/package.json` (exact `encore.dev` version)
  - `backend/tsconfig.json`
- Port: start with `encore run --port 8300` so the existing ports and proxies keep
  working. The local dev dashboard runs on `:9400` and shows traces.

### 2. Service layout
Each service is a folder with `encore.service.ts`. Start with skeletons; add
endpoints only when the demo path needs them.

```
backend/
  encore.app
  db/              # SQLDatabase "silta" + migrations (shared by all services)
  health/          # GET /api/health → { ok, db } (keep the existing contract)
  llm/             # the only place that calls Gemini; records llm_usage
  voice/           # ElevenLabs STT/TTS; audio blobs
  content/         # content items + translations + review status
  flows/           # versioned flow graphs (React Flow JSON), validation, publish
  cards/           # flash-card sets, phrases, audio refs
  regions/         # counties, services, situations (PTV seed + curated paths)
  visits/          # individual-code sessions (hash only), visit summary
  admin/           # auth handler for /admin (simple; seeded admin users)
```

- Declare one database and share it:
  `new SQLDatabase("silta", { migrations: "./migrations" })` in `backend/db/`.
  Other services call `SQLDatabase.named("silta")`.
- Keep the existing rules from `AGENTS.md`:
  - Endpoints stay thin.
  - Services own the rules; repositories own the SQL.
  - Use the `sql` tagged template, no string-built SQL.

### 3. Secrets
Declare secrets in code with `secret("GeminiApiKey")` and
`secret("ElevenLabsApiKey")` from `encore.dev/config`. Then set them locally:

```bash
encore secret set --type local,dev GeminiApiKey
```

- Timo types or pastes the values. **Agents never print, log or commit them.**
- Add the names (no values) to `.env.example` for the self-hosted path.

### 4. Migrations and pgvector
- Move `db/migrations/1_llm_usage.up.sql` to `backend/db/migrations/`. Encore
  needs the migrations inside the app root. Update the paths in `compose.yaml`,
  CI and `dev_readiness_check.sh`.
- The naming stays `<n>_<name>.up.sql`, which golang-migrate also uses.
- New migration `2_init_silta.up.sql`:
  - Start with `CREATE EXTENSION IF NOT EXISTS vector;`. Encore's local Postgres
    image includes pgvector, and on Aiven the default admin user can create the
    extension.
  - Add the first tables only as needed:
    - `content_items`
    - `content_translations`
    - `flows` / `flow_versions` (JSONB graph)
    - `card_sets` / `cards`
    - `regions` / `services`
    - `visits` (code hash, encrypted payload, `expires_at`)
    - `audio_blobs` (bytea + content hash, see below)
    - `embeddings` (`vector(768)` or the Gemini embedding size, HNSW index)
- **Audio storage:** Aiven has no object storage. For the hackathon, store
  generated or recorded clips (tens of KB) in Postgres `bytea`, served by
  `voice` with long cache headers. That keeps everything on Aiven. Switch to an
  Encore `Bucket` + GCS/S3 only if size becomes a problem.

### 5. CORS, the client and dev scripts
- In `encore.app`, set `global_cors.allow_origins_with_credentials` to the
  frontend origins: `http://localhost:5300` and later the deployed origin.
- Generate the client:
  ```bash
  cd backend && encore gen client silta --lang=typescript --output=../frontend/src/shared/api/client.ts --env=local
  ```
  This replaces the OpenAPI export behind `make api`. Mea's code imports types
  only from the generated client.
- Update the dev scripts:
  - Makefile: `dev-backend` → `cd backend && encore run --port 8300`; `api` →
    the gen-client command above; remove the `uv` targets after parity.
  - `.claude/launch.json`: the backend runtime becomes
    `encore run --port 8300` in `backend/`.

### 6. Aiven console (Timo's browser session)
**Cost gate:** check the plan's price against the $50 sign-up credit and get
Timo's OK before creating any paid service. Use the smallest plan and power it off
after the event.

1. **Project:** create or choose a project, e.g. `silta-junction`.
2. **Runtime first:** check whether Aiven Runtime (apps) is enabled for the
   account and which clouds and regions it offers. The docs still say "limited
   availability", while Aiven's Sep 2026 blog says it's generally available. Ask
   the Aiven mentors onsite if it's unclear.
3. **Pick one region for everything:** prefer `google-europe-north1` (Finland),
   else `aws-eu-north-1` (Stockholm), limited to where Runtime runs.
4. **Create the PostgreSQL service:** the newest major version offered, smallest
   plan, in that region, named e.g. `silta-pg`.
5. **When it's running:**
   - Overview → connection information: host, port, user `avnadmin`, database
     `defaultdb`, `sslmode=require`. Download the **CA certificate**.
   - Databases tab: create `silta`. Optionally create a `silta_app` user in the
     Users tab.
   - Note the plan's connection limit.
6. **Skip PgBouncer at first.** Encore pools connections itself, and PgBouncer's
   transaction mode can break prepared statements. Set `max_connections` low in
   the infra config instead.
7. **Network:** the default allowlist is open (TLS + generated password). That's
   fine for the event; tighten it to the app's egress later if time allows.
8. **Credentials:** Timo puts the password into `.env` (gitignored) as
   `AIVEN_PG_PASSWORD` and into the team password manager. Agents don't read it
   back into chat. The CA certificate isn't secret, but keep it out of git as
   `AIVEN_PG_CA` in `.env` anyway.

### 7. `backend/infra.config.json` (committed, no secret values)
Check the field names against
https://encore.dev/docs/ts/self-host/configure-infra before the first build.

```json
{
  "$schema": "https://encore.dev/schemas/infra.schema.json",
  "metadata": {
    "app_id": "silta",
    "env_name": "aiven",
    "env_type": "production",
    "cloud": "gcp",
    "base_url": "https://<deployed-api-host>"
  },
  "sql_servers": [
    {
      "host": "<aiven-host>:<port>",
      "tls_config": { "ca": { "$env": "AIVEN_PG_CA" } },
      "databases": {
        "silta": {
          "name": "silta",
          "username": "avnadmin",
          "password": { "$env": "AIVEN_PG_PASSWORD" },
          "max_connections": 10,
          "min_connections": 1
        }
      }
    }
  ],
  "secrets": {
    "GeminiApiKey": { "$env": "GEMINI_API_KEY" },
    "ElevenLabsApiKey": { "$env": "ELEVENLABS_API_KEY" }
  }
}
```

- The Aiven host isn't secret, but if you'd rather not commit it, use an `$env`
  value there too.
- If `ca` doesn't accept `$env`, render the config from a template at build time.
  Never commit a rendered file that contains secrets.

### 8. Build, migrate, run against Aiven
- Build the image:
  ```bash
  cd backend && encore build docker --config infra.config.json silta-api:dev
  ```
- **The self-hosted image does not run migrations** (per Encore's docs). Apply
  them before starting the image, with the same golang-migrate image CI already
  uses:
  ```bash
  docker run --rm -v "$PWD/backend/db/migrations:/migrations:ro" migrate/migrate:v4.19.1 -path /migrations -database "$AIVEN_SILTA_URL" up
  ```
  `AIVEN_SILTA_URL` = `postgres://avnadmin:<password>@<host>:<port>/silta?sslmode=require`,
  read from `.env` and never echoed.
- Run the image locally against Aiven with the env vars above, then check
  `GET /api/health` → `{ ok: true, db: true }`.
- Open the trace and note the query round trip. From the hackathon Wi-Fi to a
  Finnish region it should be a few ms. Same-region from the host, about 1 ms.
- **Deploy (pick one, in this order):**
  - **A. Aiven Runtime:** it builds from a Containerfile or Compose file. Ask
    the mentors whether it can run a prebuilt image (push `silta-api` to GHCR
    and reference it in a Compose file).
    - If it can't, write a Containerfile that installs the Encore CLI and runs
      `encore build docker` in a builder stage.
    - Pass env vars through Runtime's settings, never in the repo.
  - **B. Cloud Run** (or a similar host) in the same region as the Aiven service.
  - **C. East Deploy on bigie** (`docs/deployment.md`): only with Timo's explicit
    approval for that target, since it's a production server. Check bigie's
    location against the Aiven region first.

### 9. Docs to update in the same change
- Write `docs/decisions/0002-encore-ts-on-aiven.md`: Encore.ts + Aiven Postgres,
  self-hosted, same-region rule. Mark `0001` as superseded.
- `AGENTS.md`:
  - Replace "The product is not decided yet" with the Silta product statement.
  - Update the repository map (Encore services, `backend/db/migrations`) and the
    LLM rule, which now points to the `llm` Encore service.
- `backend/README.md`: how to run, secrets, gen client, build and migrate.
- `docs/deployment.md`: the Aiven path (A/B), keeping East Deploy as option C.
- `.env.example`: add `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `AIVEN_PG_PASSWORD`,
  `AIVEN_PG_CA` and `AIVEN_SILTA_URL`, all empty.

## Acceptance matrix

| # | Requirement | Implementation | Automated check | Observed evidence | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | `encore run` starts the app with local Postgres | `backend/` Encore app | `encore test` passes | 2026-11-14: `encore test` 4/4; `encore run --port 8300` serving | done (local app) |
| 2 | `GET /api/health` returns ok + db | `health` service | unit/integration test | `health.test.ts`; curl `:8300/api/health` → `status: ok`. Contract kept as `{ status, environment, checks[] }`, not `{ ok, db }` | done (local app) |
| 3 | pgvector available locally | `2_init_silta.up.sql` | `SELECT extname FROM pg_extension` via `encore db shell silta` | health check `pgvector: ok` queries `pg_extension` (test + running app) | done (local app) |
| 4 | `llm_usage` ported, Gemini call records a row | `llm` service | one ≤ €0.01 smoke call | `llm.test.ts` with `fetch` stubbed records ok and provider_error rows. No real Gemini call yet: `GeminiApiKey` is not set and the model ID in `integrations.ts` is unverified | partial (unit) |
| 5 | Generated TS client used by the frontend | `encore gen client` | `npm run build` in `frontend/` | gate `api_client` + `frontend_build` ok; health page at `:5300` shows postgres/pgvector ok | done (browser, local) |
| 6 | Aiven Postgres in the chosen region, `silta` db, pgvector | Aiven console + migrations | `pg_extension` query on Aiven | | todo |
| 7 | Docker image runs against Aiven | `infra.config.json` | health returns db true | | todo |
| 8 | App deployed in the same region as the db | Plan A or B | public `/api/health` | | todo |
| 9 | Docs and decision 0002 updated | step 9 | readiness gate | `bash dev_readiness_check.sh --all`: 8/8 ok. `docs/deployment.md` still lacks the chosen region/host | partial |

## Verification

- Run `encore test` for the backend, and `npm run build` in `frontend/` after wiring
  the client.
- `bash dev_readiness_check.sh --all`: the gate and CI still call `uv`/pytest, so
  update them in the same change or they will fail.
- Demo path: health and one real endpoint, called from the frontend in the
  running app.

## Hard rules (from AGENTS.md and team policy)

- No git state changes (commit, push, branch) without Timo's explicit approval for
  that exact action.
- No secrets in code, docs, logs or chat.
- Paid calls (Gemini, ElevenLabs, Aiven plans) need a cost estimate. Ask above
  €2 or before creating a paid Aiven service.
- No global tooling installs without approval (`brew install encore`).
- Report proof levels honestly: local, Docker against Aiven, or deployed.

## Open questions

- Does Aiven Runtime accept a prebuilt image, and which regions does it run in?
  (Ask the mentors.)
- Frontend: move to Next.js for SEO (brain architecture recommendation) or keep
  Vite + Mantine. This doesn't block this brief.
- Gemini embedding model and vector size for the `embeddings` table.

## Findings while implementing (2026-11-14)

- The Encore CLI was already installed in `~/.encore/bin` (v1.58.1, not on
  `PATH`). `encore.dev` is pinned to the same version; the Makefile, the gate and
  `.claude/launch.json` add that directory to `PATH`.
- `infra.config.json`: per Encore's schema `host` and `tls_config.ca` are plain
  strings (no `$env`); only `password` and `secrets` accept `$env`. So the Aiven
  host and CA certificate are either committed or rendered at build time.
  `AIVEN_PG_CA` in `.env.example` is unused until that is decided.
- `compose.yaml`, `compose.production.yaml`, Redis and `contracts/openapi.json`
  were removed with the Python package: Encore owns the local database, and the
  East Deploy contract no longer matched the image.
- Rehearsal of step 8 without Aiven: the image built with a local infra config,
  golang-migrate applied `1_llm_usage` and `2_init_silta` to a throwaway
  `pgvector/pgvector:pg17` container, and the image answered `/api/health` with
  postgres and pgvector ok. Proof level: Docker, local database, TLS disabled.
  `encore build docker` produces a `linux/amd64` image.
- The health contract gained a `pgvector` check and lost `redis`.
