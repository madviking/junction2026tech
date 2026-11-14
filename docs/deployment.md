Status: draft
Last reviewed: 2026-11-14

# Deployment

The backend ships as a self-hosted Encore image that talks to Aiven for
PostgreSQL. **The app and the database run in the same cloud and region**
(`docs/decisions/0002-encore-ts-on-aiven.md`): Google Cloud `europe-west4`
(Netherlands). Aiven Runtime does not run in Finland, so the database follows it.

**API:** https://easily-smart-aphid.eur-1.aiven.app (`GET /api/health`).

## What exists on Aiven

Project `appzio-d111` (trial credits, no payment method).

| Thing | Value |
| --- | --- |
| PostgreSQL service | `silta-pg`, PostgreSQL 18, Hobbyist plan (~$19/month), `google-europe-west4` (created in `europe-north1`, moved 2026-11-14), connection limit 25 |
| Database | `silta` (user `avnadmin`), migrations 1–2 applied, `vector` extension installed |
| Network | public, IP allowlist open, TLS required |
| Runtime application | `silta-api`, Startup-50-1024 (0.5 vCPU, 1 GB, ~$28/month), `google-europe-west4`, port 8080, built from `main` / `compose.aiven.yaml` |
| GitHub link | account `madviking`, repository `junction2026tech` |

Together about $47/month against the $50 trial credit. Power both off after the
event (service page → Actions).

## Pipeline

```text
push to main
  └─ GitHub Actions (.github/workflows/readiness.yml)
       1. readiness   the full gate (policy, encore test, client is current, frontend build)
       2. image       encore build docker → migrate Aiven → push ghcr.io/madviking/silta-api:{sha,main}
  └─ Aiven Runtime    Runtime → application → Actions → Deploy latest commit   (manual)
```

- Aiven Runtime builds only from a repository file, so `compose.aiven.yaml`
  points at `deploy/aiven/Dockerfile`, which is just `FROM` the GHCR image.
- A push does not redeploy on Aiven. After the `image` job is green: Runtime →
  `silta-api` → **Deploy latest commit**. The application then pulls the new
  `:main` image. If `readiness` fails, no image is published and the running
  version stays as it is.
- The image does not migrate. CI applies `backend/db/migrations` before it
  pushes the image; from a laptop use `make migrate-aiven`.

## One-time setup (done 2026-11-14; kept for a rebuild)

1. GitHub repository secret `AIVEN_SILTA_URL`, set without showing the value:
   `python3 scripts/aiven.py url | gh secret set AIVEN_SILTA_URL`.
2. After the first `image` run, make the GHCR package `silta-api` public
   (GitHub → Packages → silta-api → Package settings). Aiven pulls it anonymously.
3. Aiven console → Runtime → Deploy application → account `madviking`,
   repository `junction2026tech`, branch `main`, manifest `compose.aiven.yaml`.
4. In the application's environment variables set `AIVEN_PG_PASSWORD` and
   `GEMINI_API_KEY`, marked as secret. A new Encore secret needs a mapping in
   `infra.config.json` and a variable here.
5. Put the application's public URL into `metadata.base_url` in
   `backend/infra.config.json`, and the frontend's origin into
   `global_cors` in `backend/encore.app`.

## Runtime environment variables

| Variable | Used by | Value |
| --- | --- | --- |
| `AIVEN_PG_PASSWORD` | image | password of `avnadmin` |
| `GEMINI_API_KEY` | image | provider key, spend-capped, hackathon-only |
| `AIVEN_SILTA_URL` | CI migrations only (repository secret) | full connection URL; locally `scripts/aiven.py` builds it from `AIVEN_PG_PASSWORD` |

The database host and the project CA certificate are literals in
`backend/infra.config.json` (Encore's schema takes no env reference there).
Neither is a secret. Adding or renaming a variable is a contract change: update
`.env.example`, `infra.config.json` and the Runtime settings together.

## From a laptop

```bash
make image           # encore build docker --config infra.config.json silta-api:dev
make migrate-aiven   # needs AIVEN_PG_PASSWORD in .env
make run-image       # also needs GEMINI_API_KEY; serves :8300 (BACKEND_PORT=8302 if encore run is up)
```

Verified 2026-11-14 from a laptop: migrations applied, and the image answered
`/api/health` with postgres and pgvector ok over TLS. Each query took roughly
350 ms because the laptop's network was about 160 ms away from the database;
that is the reason for the same-region rule, not a database problem.

## Fallbacks

- **B.** Cloud Run in the database's region running the same GHCR image.
- **C.** East Deploy: only with explicit approval for that target.

## Rules

- Secrets live in GitHub secrets, the Runtime settings and the team password
  manager, never in this repository.
- Pin an exact commit for anything shown to judges.

## Open

- The frontend runs as a third Runtime application, `silta-web`, from `compose.web.yaml`
  (nginx serves the static build and proxies `/api/` to the API, so no CORS entry is
  needed). It only works once the API image is current: the API on Aiven still runs the
  last image CI pushed, and CI has been red since "Initial build".
- Redeploying Runtime from CI instead of by hand.
