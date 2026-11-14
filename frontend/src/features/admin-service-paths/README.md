# admin-service-paths

Admin module for service paths by area (backend: `backend/service_paths/README.md`,
plan: `docs/planning/2026-11-14-service-paths.md`).

- `ServicePathsPage` (`/admin/service-paths`): tabs **Areas** (fact counts by status,
  disputed/stale flagged; a row opens the area) and **Compare** (published values per
  area against Finland in the same period, green better / red worse, "not published"
  where a value is missing; published steps per stage beside the national limit).
- `AreaPage` (`/admin/service-paths/:id`): status tiles and tabs Doors, Steps (every
  national stage, mapped or not), Screening, Measured values, Findings, Sources. A
  status filter narrows each table; a row opens its editor.
- Editors (`components/*Drawer.tsx` on the shared `EditDrawer`): save the fields, then
  **Publish, checked today** (stamps `verified_on`), **Mark disputed**, **Mark stale**,
  **Back to draft**. The backend refuses publishing without a source; metrics and
  findings refuse saving without one here too. `SourcePicker` picks or adds a source.
- Source links open in a new tab and do not open the row editor (`ActionButton external`).

`api/servicePaths.ts` (keys `['admin-service-paths', ...]`; every save invalidates all),
`lib/format.ts` (labels, status tones, list/tri-state helpers), `types.ts` (generated
aliases). Tests: `ServicePaths.test.tsx` with `__fixtures__/data.ts`.
