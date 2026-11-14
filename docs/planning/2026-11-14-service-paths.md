Status: active
Last reviewed: 2026-11-14

# Service paths by area (palvelupolut)

## Goal

Silta knows the concrete service path in five areas: which door to contact for each
access route, how to reach it, what happens at each stage, the legal limit and the
measured wait. An admin keeps these facts current in a new admin module, every fact
shows its source, and the county report compares areas stage by stage. The resident
frontend (the real door behind `{door}`) comes after the admin module.

Areas: Helsinki, Länsi-Uusimaa (LUVN), Kymenlaakso, Etelä-Pohjanmaa,
Pohjois-Pohjanmaa. Helsinki and LUVN share HUS; Kymenlaakso (38 %) and
Etelä-Pohjanmaa (18 %) are the worst and best counties for positive colorectal
screening results without a programme colonoscopy in 2024; Pohjois-Pohjanmaa adds
OYS and its digital bladder-cancer path.

## Scope

- In: data model and migration, a `service_paths` backend service, seed from the
  brain research, admin module (list, edit, verify, compare), a public read endpoint
  for the comparison, the equality test.
- Later (separate slice): resident door details in the journey, county-view
  comparison panel, presentation report.
- Out: areas beyond the five, scraping or live sync of county pages, any new
  wording in the content document (resident wording stays in `content`).

## Research inputs (junction2026 brain)

| Area | Source |
| --- | --- |
| Helsinki, LUVN | `sources/2026-11-13-web-research-service-paths.md` |
| Kymenlaakso | `sources/2026-11-14-web-research-service-paths-kymenlaakso.md` |
| Etelä-Pohjanmaa | `sources/2026-11-14-web-research-service-paths-etela-pohjanmaa.md` |
| Pohjois-Pohjanmaa | `sources/2026-11-14-web-research-service-paths-pohjois-pohjanmaa.md` |
| Measured waits, screening, all five + Finland | `sources/2026-11-14-sotkanet-thl-service-path-waits-five-areas.md` |

## Design rules

1. **Area changes the door, never the lane or the clock.** Lane + route still decide
   destination type, script and legal clocks (`care_paths`). The area only fills in
   the concrete door and adds measured waits. A test asserts that composing the same
   lane and route for every area gives identical lanes and clocks.
2. **Legal limits and measured waits are separate fields.** Legal and recommended
   limits are national and live in code (stage catalogue below). Measured values are
   per area, per period, with a metric definition. The UI shows both side by side;
   nothing converts one into the other.
3. **Every fact has a source and a check date.** Rows reference `sp_sources`; a row
   shows on resident and public screens only when `status = 'published'`. Unknowns
   are stored as unknown, never guessed.
4. **Facts, not wording.** Service-point names, phones and hours are facts in Finnish
   (plus an English label). Instructions to residents stay as texts in the content
   document with placeholders. This keeps decision 0003 intact.

## Data model

### Stage catalogue (code, national)

`backend/service_paths/domain/stages.ts`, ordered. Each stage maps to the journey
stage it belongs to and carries the national limits from rules.yaml clocks and the
brain source (Health Care Act §51–52, STM 2010:6).

| Stage | Journey stage | Legal / recommended limit |
| --- | --- | --- |
| `contact` | contact | same weekday (legal) |
| `assessment` | contact | by the 3rd weekday if not on the call (legal) |
| `primary_visit` | wait / visit | 3 months; under 23: 14 days (legal) |
| `referral_processing` | followup | 3 weeks from arrival (legal) |
| `specialist_first_visit` | followup | needs assessment within 3 months if tests (legal) |
| `diagnostics` | followup | imaging and pathology within 1 week (recommended) |
| `treatment_start` | followup | 6 weeks from referral for suspected cancer (recommended); 6 months non-urgent (legal) |
| `screening_invitation` | describe | programme interval (open) |
| `screening_result` | wait | about 1 month for FIT by letter (open) |
| `screening_followup` | followup | none set; chase like an alarm symptom (recommended) |

### Tables (migration `10_service_paths`, owner `service_paths`)

Built as `sp_areas`, `sp_sources`, `sp_points` (doors), `sp_steps`, `sp_screening`,
`sp_metrics`, `sp_findings`. The schema lives in
`backend/db/migrations/10_service_paths.up.sql`; field meanings and endpoints in
`backend/service_paths/README.md`. Area metadata (specialist provider, collaboration
area, Sotkanet region id) sits in `sp_areas`, so `counties` stays owned by `regions`;
the migration only adds the four new county rows.

### Comparison metrics (first set)

Sotkanet region ids: Helsinki 960, LUVN 969, Kymenlaakso 967, Etelä-Pohjanmaa 958,
Pohjois-Pohjanmaa 973, Finland 658 → `sp_areas.sotkanet_region_id`.

| Stage | Metric | Definition | Better |
| --- | --- | --- | --- |
| `primary_visit` | `sotkanet:6411` | % of non-urgent doctor visits waiting > 7 days from assessment | lower |
| `primary_visit` | `sotkanet:6410` | same, > 3 months (over the legal limit) | lower |
| `primary_visit` | `sotkanet:6412` | % of non-urgent nurse visits waiting > 7 days | lower |
| `referral_processing` | `sotkanet:5033` | % of specialist referrals processed after > 21 days | lower |
| `treatment_start` | `sotkanet:3336` | waiting > 6 months for specialist care, per 10 000 | lower |
| `screening_result` | `sotkanet:3621` / `3620` / `6103` | attendance in breast / cervical / colorectal screening | higher |
| `screening_followup` | `cancer_registry:fit_no_colonoscopy` | % of positive FIT results without a programme colonoscopy | lower |

Known holes, shown as "not published" rather than blank: LUVN has no 3336/5033 row;
no area-level cancer-specific time (referral → diagnosis/treatment) exists anywhere.

### What the research changed

- Contact models differ in shape, not just values: Kymenlaakso has one booking number
  for all stations; Seinäjoki routes by surname initial; Pohde shows numbers only after
  you pick a municipality → `contact_note`, and a county-level `phone_service` point.
- Sources conflict (no-show fee €73.70 vs €60.60 in Kymenlaakso; radiotherapy Vaasa vs
  Tays for Etelä-Pohjanmaa) → `disputed` status instead of picking one silently.
- Interpreter procedure is unpublished in three of five areas → `interpreter_how` NULL
  renders as "not published", which is itself a finding for the report.
- Stage-level follow-up differs in a way the comparison can show: a positive FIT in
  Kymenlaakso means phoning a nurse line open 4 h a week (Fridays); Etelä-Pohjanmaa
  routes positives to its gastro clinic with a screening nurse → `area_steps` for
  `screening_followup`, paired with `cancer_registry:fit_no_colonoscopy`.

### Seed

`backend/service_paths/seed/<county>.yaml`, one file per area, written from the brain
sources (each record carries its source URL). Loaded on an empty database, like the
content seed; after admin edits the database is the truth.

## API

Public (anonymous):

- `GET /api/service-paths/areas` → areas with specialist provider and published counts.
- `GET /api/service-paths/areas/:id?route=A1` → published doors for the route, area
  steps by stage, screening programmes, metrics with legal limits beside them.
- `GET /api/service-paths/compare?stages=` → matrix area × stage: legal limit, latest
  metric per area, Finland baseline, source per cell, `scope` flag.

Admin (`auth: true`, `requireAdmin()`): list, create, update, set status for service
points, area steps, screening programmes, metrics, findings and sources.

## Admin module

Route `/admin/service-paths` (feature `frontend/src/features/admin-service-paths/`):

1. Areas overview: one row per area, counts by status, oldest `verified_on`.
2. Area page: tabs Doors, Steps, Screening, Metrics, Findings. Inline edit, a source
   picker (or new source), "Mark verified" sets `verified_on` to today.
3. Compare: the matrix from `/compare`, cells coloured against the legal limit and
   the Finland baseline, each cell links to its source.

## Owners and file slices

| Slice | Owner | Paths |
| --- | --- | --- |
| Research captures | done (Claude research agents) | brain `sources/2026-11-14-*service-paths*` |
| Schema + service + seed | done (Claude, 2026-11-14) | `backend/db/migrations/10_service_paths.up.sql`, `backend/service_paths/` |
| Admin module | done (Claude, 2026-11-14) | `frontend/src/features/admin-service-paths/`, `frontend/src/app/adminRoutes.tsx` |
| Resident door + county panel | later | `care_paths/domain/compose.ts`, `features/journey`, `features/county` |

## Acceptance matrix

| # | Requirement | Implementation | Automated check | Observed evidence | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Data model for service paths | migration 10, `service_paths/` | `encore test service_paths/` | 24 tests pass (2026-11-14) | done |
| 2 | Five areas mapped from public sources | brain sources + `seed/areas/*.yaml` | `seed_files.test.ts` | 5 areas valid, 0 errors | done |
| 3 | Waits and contacts per area with sources | `sp_points`, `sp_metrics`, `sp_sources` | public rows have source + verified_on | `service_paths.test.ts` | done |
| 4 | Own admin module | `/admin/service-paths`, `/admin/service-paths/:id` (`features/admin-service-paths`) | `ServicePaths.test.tsx` (6), backend admin tests | unit + build; running app checked 2026-11-14 (areas, compare, area page, door editor; no console errors) | done |
| 5 | Comparison for project reporting | `GET /api/service-paths/compare` + admin Compare tab | `compare.test.ts`, endpoint test, page test | 6411, FIT gap, missing LUVN 3336; seen in the running app | done |
| 6 | Area never changes lane or clocks | national stages in code | same stages for all areas (test) | compose-level test comes with the resident slice | partly |

## Verification

- `encore test service_paths/`, `npx vitest run care_paths/`
- `bash dev_readiness_check.sh --paths backend/service_paths frontend/src/features/admin-service-paths`
- Admin module checked in the running app with a screenshot.

## Open questions

- Should published service-point names appear in the resident language, or always in
  Finnish with a translated kind label? (Proposal: Finnish name + translated kind.)
- Who verifies the seed before it is published: one teammate per area?
- Does the comparison belong on `/county/:id` or a new `/compare` public page?
