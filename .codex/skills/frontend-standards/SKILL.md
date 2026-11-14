---
name: frontend-standards
description: Use when changing frontend UI, hooks, state, routing, styles or API usage. Enforces feature boundaries, generated API types, Mantine-first UI, layout conventions, lint/test/build gates and a real-app check.
---

# Frontend Standards

Read `frontend/README.md` once, then the touched feature's `README.md`.

## Structure and boundaries

- `src/app/`: composition only (providers, router, shell). May import features.
- `src/features/<name>/`: one feature per folder with its own `README.md`,
  components, hooks and tests. A feature imports only from itself and
  `@/shared/...` (lint rule `local/no-cross-feature-imports`). Something two
  features need moves to `src/shared/`.
- `src/shared/`: API client, generated types, shared UI and hooks.

## API contract

- Types come from the generated `@/shared/api/client.ts` (`make api`), aliased
  in `@/shared/api/types.ts`.
  Never declare local `*Request`/`*Response`/`*Dto` types (lint rule
  `local/no-local-api-contract-types`).
- Call the backend through the `api` instance in `@/shared/api/api.ts` and TanStack Query hooks in
  the feature. Query keys start with the feature name.
- Product data is persisted by the backend. `localStorage`/`sessionStorage` only
  for UI conveniences (lint warns on direct use).

## UI conventions

- Everything visual comes from `@/shared/ui` (resident + shared primitives) and
  `@/shared/ui/admin` (admin-only primitives). Read `src/shared/ui/README.md`.
  Features never import `@mantine/core`, CSS files, inline `style`, hex/rgb colours or
  raw style props (`local/no-raw-styles`). Missing capability → extend the primitive in
  `shared/ui`. Icons: `@tabler/icons-react`.
- Resident screens: mobile first at 375 px, 48 px touch targets, `PageShell`, logical
  properties only (RTL). Admin: desktop first, usable at 768 px, `AdminShell`.
- Every async view has loading, empty and error states (`LoadingState`, `EmptyState`,
  `ErrorState` with retry).
- Resident copy comes from the published content through `@/shared/i18n` (`t(key)`),
  never hard-coded; new strings are `ui.<feature>.*` keys in
  `backend/care_paths/seed/ui/<feature>.yaml`. Admin copy is English in components.
- Features import other features only through their public `index.ts`; resident
  features never import `admin-*` features or `@/shared/ui/admin`
  (`local/no-cross-feature-imports`).
- Accessible by default: labelled inputs, `aria-label` on icon-only buttons,
  keyboard reachable menus, visible focus.

## Dependencies

Pin exact versions in `package.json`. Before adding a package: `npm audit`,
review high/critical advisories, check the bundle impact, prefer what Mantine
or the platform already gives. Install with `npm ci` after the lockfile changes.

## Verification

1. Targeted: `cd frontend && npx vitest run src/features/<name>`.
2. `bash dev_readiness_check.sh` (runs lint, typecheck, tests and build for
   frontend scope).
3. Check the changed screen in the running app (`make dev-frontend` with the
   backend up): the real data path, an empty state and an error state. For
   repeatable checks add a Playwright spec under `frontend/e2e/` and run
   `npm run test:e2e`. A passing unit test with mocked data is not acceptance of
   a user flow.
