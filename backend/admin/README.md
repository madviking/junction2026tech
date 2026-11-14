# admin

Admin sign-in, the app's auth handler and the audit log. Resident, clinician and
county endpoints stay anonymous; every endpoint with `auth: true` requires a signed-in
admin.

- `auth.ts`: Encore auth handler + gateway. `Authorization: Bearer <token>`; the token
  is checked against `admin_sessions` (stored as sha256, 12 h).
- `../lib/admin_actor.ts`: `requireAdmin()`, the first line of every admin endpoint in
  any service (in-process calls bypass the gateway) and the actor for audit rows.
- Local test users: `seed/admin-users.local.yaml` (throwaway local credentials, loaded
  on first use, passwords hashed with scrypt; existing users are never overwritten).
  Replace this before any deployment.

## Endpoints

- `POST /api/admin/sign-in` `{ email, password }` → `{ token, expiresAt, user }`.
- `POST /api/admin/sign-out` (auth).
- `GET /api/admin/me` (auth) → `AdminProfile`.
- `GET /api/admin/audit?limit=` (auth) → `{ entries }`.
- `GET /api/admin/usage` (auth) → `UsageReport` (`usage.ts`): paid spend by day, service,
  provider and feature, from `llm.usageSummary` and `voice.usageSummary`, with totals.
- Internal `admin.recordAudit({ actor, action, target, detail })`: other services record
  their admin writes here.

## Tables

`admin_users`, `admin_sessions`, `audit_log` (migration `4_admin`).

## Tests

`encore test admin/` — password hashing, sign-in, the auth handler, anonymous rejection.
