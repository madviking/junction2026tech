# frontend

Vite + React 19 + TypeScript + Mantine 9, TanStack Query, React Router.
Standards: `.codex/skills/frontend-standards/SKILL.md`.

## Run

```bash
npm ci
npm run dev        # http://localhost:5300, proxies /api to http://localhost:8300
```

## Layout

```text
src/
  main.tsx                 entry
  app/                     composition: providers, routes, shell (may import features)
  features/<name>/         one folder per feature + README.md + tests
  shared/api/              client.ts (openapi-fetch), generated/openapi.ts, types.ts aliases
  shared/ui/               theme and shared components
  test/                    vitest setup and renderWithProviders
e2e/                       Playwright specs against the running app
eslint-rules/              local policy rules (feature boundaries, API contract types)
```

## Scripts

| Script | Does |
| --- | --- |
| `npm run lint` | ESLint, including local policy rules |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:run` | Vitest once |
| `npm run build` | typecheck + production build |
| `npm run generate:api` | `contracts/openapi.json` → `src/shared/api/generated/openapi.ts` (use `make api` from the root) |
| `npm run test:e2e` | Playwright against `E2E_BASE_URL` (default `http://localhost:5300`); first run `npx playwright install chromium` |

`Dockerfile` has a `dev` target (Vite) and a `production` target (static build
served by nginx, proxying `/api` to `junction2026-backend:8000`, the container name in `compose.production.yaml`).
