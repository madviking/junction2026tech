# admin-auth

Admin sign-in, the admin session and the authenticated API client for every admin feature.
English only, desktop first.

## Public API (`index.ts`)

- `SignInPage` — `/admin/sign-in`, outside the AdminShell. Email + password; a 401 shows
  "Wrong email or password." On success goes to `?next=` (admin paths only, else `/admin`).
- `RequireAdminSession` — renders its children only with a session, otherwise redirects to
  `/admin/sign-in?next=<current path>`. Used by `src/app/admin/AdminArea.tsx`.
- `AdminSessionMenu` — signed-in name + Sign out (calls `api.admin.signOut`, then forgets
  the session and every `admin-*` query) for the AdminShell header.
- `useAdminApi()` — the generated `Client` with `auth: () => ({ authorization: 'Bearer <token>' })`.
  Its fetcher clears the session on any 401, so the guard sends the admin back to sign-in.
- `useAdminSession`, `getAdminSession`, `setAdminSession`, `clearAdminSession`,
  `adminErrorMessage`, `adminApiBase`.

## Decision: token in sessionStorage

The bearer token (12 h server session) is kept in `sessionStorage` under
`silta.admin.session` as a UI convenience, so a reload keeps the admin signed in. It is
per tab, cleared on sign-out, on any 401 and when `expiresAt` passes. All storage access is
wrapped in try/catch; without storage the session lives in memory for the page. No product
data is stored. The lint rule against storage is disabled on that one line with this reason.

## Files

`session.ts` (store, `useSyncExternalStore`), `adminApi.ts` (client, 401 handling),
`api/useSignIn.ts`, `api/useSignOut.ts`, `components/SignInForm.tsx`, `components/UserMenu.tsx`,
`safeAdminNext.ts`, `types.ts`.

## Tests

`adminAuth.test.tsx` (sign-in stores the session and redirects to next, 401 message, bearer
header and 401 clears the session) and `src/app/admin/AdminArea.test.tsx` (guard redirect).
Browser: `e2e/admin/guard.spec.ts`.
