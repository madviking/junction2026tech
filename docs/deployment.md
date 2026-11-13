Status: draft
Last reviewed: 2026-11-14

# Deployment

Nothing is deployed yet. The backend ships as a self-hosted Encore image that
talks to Aiven for PostgreSQL. **The app and the database run in the same cloud
and region** (`docs/decisions/0002-encore-ts-on-aiven.md`).

## What this repository provides

- `backend/infra.config.json`: database host, TLS and secret references by
  environment-variable name. No secret values.
- `make image`: `encore build docker --config infra.config.json silta-api:dev`.
  The container listens on `8080`.
- `make migrate-aiven`: applies `backend/db/migrations` with golang-migrate.
  Always run it before starting a new image; the image does not migrate.
- Health: `GET /api/health`.
- `frontend/Dockerfile` (`production` target): static build served by nginx.

## Runtime environment variables

| Variable | Used by | Value |
| --- | --- | --- |
| `AIVEN_PG_PASSWORD` | image | password of the database user in `infra.config.json` |
| `AIVEN_PG_CA` | image | Aiven CA certificate (PEM) |
| `GEMINI_API_KEY`, `ELEVENLABS_API_KEY` | image | provider keys, spend-capped, hackathon-only |
| `AIVEN_SILTA_URL` | migrations only | full connection URL with `sslmode=require` |

Adding or renaming one is a contract change: update `.env.example`,
`infra.config.json` and the host's settings together.

## Where the app runs (in this order)

- **A. Aiven's app runtime**, in the same region as the database. Open: whether
  it runs a prebuilt image or must build from a Containerfile.
- **B. A container host in the same region** (for example Cloud Run in
  `europe-north1` if the database is in `google-europe-north1`).
- **C. East Deploy.** Only with explicit approval for that target, and only if
  the host is close to the Aiven region.

## Rules

- Secrets live in the host's settings and the team password manager, never in
  this repository.
- Use the smallest Aiven plan and power the service off after the event.
- Pin an exact commit for anything shown to judges.

## Open questions

- Region and runtime choice (A or B), public hostname, and how the frontend is
  served next to the API.
