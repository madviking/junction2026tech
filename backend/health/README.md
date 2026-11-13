# health

Reference service: copy its shape (`<name>.ts` endpoint → `service.ts` rules →
`repository.ts` SQL).

- `GET /api/health` → `{ status, environment, checks[] }`. Checks: `postgres`
  (round trip) and `pgvector` (extension installed). Always HTTP 200.
- Owns no tables.
- Test: `encore test health` (runs against Encore's test database).
