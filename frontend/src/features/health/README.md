# health (feature)

Reference feature: copy its shape for new features.

- `HealthPage.tsx`: route `/health` (registered in `src/app/residentRoutes.tsx`).
  PageShell + SurfaceCard with a Section, loading, error (with retry) and data
  states, composed only from `@/shared/ui` primitives.
- `index.ts`: public entry; other code imports `@/features/health`.
- `useHealth.ts`: TanStack Query hook over `GET /api/health`, through the
  generated client. Query key `['health']`.
- `HealthPage.test.tsx`: stubs `fetch` (the network boundary) and asserts the
  rendered states. Run: `npx vitest run src/features/health`.

Imports only from `@/features/health/*` and `@/shared/*`.
