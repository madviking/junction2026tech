# admin

Admin sign-in, the app's auth handler and the audit log. Resident, clinician and
county endpoints stay anonymous; every endpoint with `auth: true` requires a signed-in
admin.

- `auth.ts`: Encore auth handler + gateway. `Authorization: Bearer <token>`; the token
  is checked against `admin_sessions` (stored as sha256, 12 h).
- `../lib/admin_actor.ts`: the first line of every admin endpoint in any service
  (in-process calls bypass the gateway) and the actor for audit rows. `requireAdmin()`
  admits editors only; `requireAdminView()` also admits viewers and is only for endpoints
  that change nothing (GET reads, sign-out). Fail closed: a new endpoint that uses
  `requireAdmin()` is safe by default. `admin.test.ts` ("view-only guard coverage") fails if
  a non-GET endpoint uses `requireAdminView()` or an `auth: true` endpoint has no guard.
- Roles: `editor` (every team account) and `viewer` (the public demo account, below). A
  viewer's write gets 403 `permission_denied` with a "view-only demo account" message.
- Local test users: `seed/admin-users.local.yaml` (throwaway local credentials, loaded
  on first use, passwords hashed with scrypt; existing users are never overwritten).
  Replace this before any deployment.

## Demo viewer

`demo@silta.test` / `silta-demo-viewer` (`DEMO_VIEWER` in `service.ts`): a view-only account
whose credentials are public on purpose. The sign-in page and the project site
(`../presentation/content/site.yaml`, `links.admin.demo_login`) show them, so judges can look
around the deployed admin. It is created or reset on first use in every environment,
production included, and failed sign-ins never lock it (its password is public, so the
throttle would only let anyone lock the demo for everybody). It sees everything a team admin
sees, including the audit log and usage spend. Change the credentials in `service.ts` and
`site.yaml` together.

Decision: the role comes from the account's email (`roleFor`), not a database column. The
Aiven image does not run migrations (`make migrate-aiven` is a separate step) and CI deploys
on every green push, so a role column would break admin sign-in in production until someone
migrated.

## Endpoints

- `GET /api/admin/demo` (public) → `{ email, password, displayName }` of the demo viewer.
- `POST /api/admin/sign-in` `{ email, password }` → `{ token, expiresAt, user }`; `user.role` is
  `editor` or `viewer`.
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

`encore test admin/` — password hashing, sign-in, the auth handler, anonymous rejection, the
demo viewer (role, no lockout, editors refused nothing) and the guard coverage check.
