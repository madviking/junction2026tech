# lib

Plain helpers shared by services (no endpoints, no tables).

- `admin_actor.ts`: `requireAdmin()` — first line of every admin endpoint; throws
  `unauthenticated` without a signed-in admin and returns the actor for the audit log.
