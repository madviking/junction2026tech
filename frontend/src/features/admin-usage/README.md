# admin-usage

`UsagePage` (`/admin/usage`): paid usage and the audit log.

- StatTiles: total spend and spend per provider (`api.admin.usage().totals`).
- Usage table: day, service, provider, feature, calls, tokens, characters, seconds, cost USD.
- Audit log table (`api.admin.audit({ limit: 200 })`): when, who, action, target, detail.

`api/usage.ts` (keys `['admin-usage', ...]`), `components/*`, `types.ts`.
Browser: `e2e/admin/screens.spec.ts`.
