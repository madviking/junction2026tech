# admin-content

Content admin: every text in every language, the draft, publish, versions and rollback.
Backend: `backend/content/README.md` (admin endpoints `api.content.admin*`).

## Pages

- `ContentPage` (`/admin/content`)
  - Draft panel on top: no draft (live version N) or draft based on vN with K changed texts,
    error and warning counts, the changed keys and every issue. Publish (optional note) and
    Discard (asks to confirm). A refused publish (`invalid_argument`) shows "Nothing was
    published" with the issues from the error details; the live version stays.
  - Tabs: Texts (DataTable with filters: language, show all / needs review / missing
    translation, group, search; per-language badges checked / unchecked / missing and
    "Changed in draft") and Review flags (clinical / legal flags of the live structure).
  - Row → SideDrawer: one TextAreaField per language (Arabic `dir="rtl"`), Save per
    language (`adminSetText`; resets that language to unchecked), review status with reviewer
    and date, Mark checked / unchecked (`adminSetReview`). Journey groups cover stage
    questions, outcome cards and their then-texts.
- `VersionsPage` (`/admin/versions`): versions table (version, live badge, note, by, date),
  Roll back (inline confirm), Export live as `rules.yaml` (Blob download).

## Structure

`api/queries.ts`, `api/mutations.ts` (TanStack Query; keys `['admin-content', ...]`; publish
and rollback also invalidate the resident `['content']` cache), `components/*` (no fetching),
`lib/format.ts` (dates, issues from an APIError, file download), `state/useDebouncedValue.ts`,
`types.ts` (aliases of generated types). All calls go through `useAdminApi()` from `admin-auth`.

## Tests

`ContentPage.test.tsx`: the drawer saves one language (PUT body), Arabic field is RTL, a
refused publish shows its issues. Browser: `e2e/admin/screens.spec.ts`,
`e2e/admin/publish-rollback.spec.ts`.
