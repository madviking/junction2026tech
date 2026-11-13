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

- Mantine components and theme tokens first; no second component library.
  Icons: `@tabler/icons-react`.
- Page tabs sit outside cards; tab content sits in `Card withBorder radius="md"`.
- Section header inside a card: small uppercase dimmed eyebrow, `Title order={4}`,
  optional dimmed description.
- More than one row-level action collapses into a single `Actions` menu.
- Avoid card-in-card-in-card. Keep search/filter controls and their table in the
  same card.
- Every async view has loading, empty and error states. Errors say what failed
  and how to retry.
- Copy is English. Keep user-visible strings short and in components; if the
  idea needs localisation, add i18next then, not now.
- Accessible by default: labelled inputs, `aria-label` on icon-only buttons,
  keyboard reachable menus.

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
