# health

Reference module: copy its shape for new modules.

- `GET /api/health` → `HealthStatus` (`status` = `ok` | `degraded`, one check per
  dependency: `postgres`, `redis`). Always HTTP 200 so a degraded dependency does
  not restart the API container; read `status` instead.
- `router.py` (HTTP only) → `service.py` (rules, no SQL) → `repository.py` (SQL).
- Owns no tables.
- Tests: `backend/tests/health/`. With `make up` running, the checks report `ok`;
  without it, `degraded`.
