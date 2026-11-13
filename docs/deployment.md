Status: draft
Last reviewed: 2026-11-13

# Deployment

Nothing is deployed yet. This is how the app will ship when we need a public demo
URL, following East's standard: **the application repository owns its images and
runtime contract; East Deploy (`east-deploy-v2`) owns the catalog entry, secret
references, network wiring, routing, rollout and rollback.**

## What this repository provides

- `backend/Dockerfile` (`production` target) and `frontend/Dockerfile`
  (`production` target: static build served by nginx, which proxies `/api` to the
  backend).
- `compose.production.yaml`: `migrations`, `backend` and `web` services, joined to
  the external `east_production` network. It reads only environment variables;
  East Deploy renders the `.env` next to it.
- Health: `GET /api/health` on the backend, `GET /` on `web`.

Check it builds before asking for a deploy:

```bash
docker compose -f compose.production.yaml --env-file .env build
```

## What East Deploy needs (separate change in `east-deploy-v2`)

A catalog entry `services/junction2026.yaml`, modelled on
`services/technologies-queast.yaml`:

```yaml
service_id: junction2026
checkout_name: junction2026
source:
  repo_url: <git URL of this repository>
  ref_type: commit
  ref: <exact commit to deploy>
  tracking_branch: main
mode:
  class: active_only
  allowed: [active]
databases:
  postgresql:
  - name: junction2026
runtime:
  env:
    target_path: .env
    entries:
      ENVIRONMENT: {value: production}
      DATABASE_URL: {gsm: svc-junction2026-database-url}
      REDIS_URL: {value: redis://redis:6379/<free index>}
      OPEN_ROUTER_API_KEY: {gsm: <dedicated hackathon key; not Queast's>}
deploy:
  kind: compose
  compose_file: compose.production.yaml
  commands:
    deploy:
      active: docker compose -f compose.production.yaml up -d --build --remove-orphans
    stop: docker compose -f compose.production.yaml down --remove-orphans
    status: docker compose -f compose.production.yaml ps --all
health:
  strategy: compose_running_or_healthy
  required_services: {active: [backend, web]}
routing:
  nginx:
    enabled: true
    snippet_path: services/overlays/junction2026/junction2026.conf
```

Then deploy with the East Deploy wrapper (operator only, needs approval because
the target host is production):

```bash
./scripts/deploy-service.sh bigie junction2026 --commit <sha>
```

## Rules

- Secrets come from Google Secret Manager through the catalog, never from this repo.
- Use a dedicated, spend-capped LLM key for the hackathon, not a production
  service key.
- Pin an exact commit for anything shown to judges; branch overrides are for
  temporary testing.
- Adding or renaming a runtime environment variable is a deployment contract
  change: update `.env.example`, `compose.production.yaml` and the catalog entry
  together.

## Open questions

- Public hostname (subdomain under an East domain, or a hackathon-provided host).
- Whether bigie is acceptable for a public hackathon demo, or a separate small host.
