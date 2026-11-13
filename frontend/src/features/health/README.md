# health (feature)

Reference feature: copy its shape for new features.

- `HealthPage.tsx`: route `/`. Card with section header, loading, error (with
  retry) and data states.
- `useHealth.ts`: TanStack Query hook over `GET /api/health`, through the
  generated client. Query key `['health']`.
- `HealthPage.test.tsx`: stubs `fetch` (the network boundary) and asserts the
  rendered states. Run: `npx vitest run src/features/health`.

Imports only from `@/features/health/*` and `@/shared/*`.
