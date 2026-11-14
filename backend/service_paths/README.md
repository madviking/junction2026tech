# service_paths

Service paths (palvelupolut) by area: the concrete doors for each access route, how
each stage works, screening programmes, measured waits and sourced bottlenecks, for
Helsinki, Länsi-Uusimaa, Kymenlaakso, Etelä-Pohjanmaa and Pohjois-Pohjanmaa. Plan and
design rules: `docs/planning/2026-11-14-service-paths.md`.

## Rules

- **Area changes the door, never the clock.** Stages and their legal/recommended limits
  are national, in `domain/stages.ts`; every area returns the same list (tested).
- **Legal limits and measured waits stay apart.** Limits come from code; measured values
  are `sp_metrics` rows with a definition, period and source.
- **Every fact has a source and a status.** `draft | published | disputed | stale`.
  Public endpoints return only `published`. Publishing needs a source and `verified_on`
  (the day someone checked the fact against its source).
- **Facts, not wording.** Names, phones and hours are facts (Finnish name + English label).
  Resident instructions stay as texts in `content`.

## Layout

```text
domain/stages.ts    stage catalogue with national limits; closed code lists
domain/seed.ts      parse + validate seed YAML (pure)
domain/compare.ts   area × stage matrix against Finland (pure)
seed/areas/*.yaml   one file per area, written from the junction2026 brain sources
seed/metrics.yaml   Sotkanet / Cancer Registry values for the five areas and Finland
seed/load.ts        the only disk I/O
service.ts          seed sync, public views, compare
admin_service.ts    admin validation, writes, audit
repository.ts       reads + seed inserts; repository_admin.ts admin writes
service_paths.ts    public endpoints; admin.ts admin endpoints
```

## Seed

On first use the seed is validated (any error blocks) and rows that are missing are
inserted; existing rows are never overwritten, so admin edits win. To add a fact before
anyone has edited it, add it to the YAML; after that, use the admin. Sources are keyed
by URL. Brain sources: `sources/2026-11-13-web-research-service-paths.md` (Helsinki,
LUVN), `sources/2026-11-14-web-research-service-paths-<area>.md`,
`sources/2026-11-14-sotkanet-thl-service-path-waits-five-areas.md`.

Arrays travel to SQL as JSON text (`${json(x)}::text::jsonb`); the `::text` matters,
otherwise Postgres types the parameter as jsonb and gets a JSON string scalar.

## Endpoints

Public:

- `GET /api/service-paths/stages` → `{ stages }`.
- `GET /api/service-paths/areas` → `{ areas }` with status counts.
- `GET /api/service-paths/areas/:id?route=A1` → `AreaPath` (published doors for the
  route, steps, screening, metrics, findings, each with its source).
- `GET /api/service-paths/compare` → `CompareView`: metric rows (latest Finland period,
  each area's value or null, `vsFinland`) and step rows by stage.

Admin (`auth: true`, audited as `service_paths.<kind>.<action>`):

- `GET /api/service-paths/admin/areas/:id` → all rows including drafts, plus sources.
- `PUT .../admin/points | steps | screening | metrics | findings` → upsert.
- `POST .../admin/sources` → add a source (https only).
- `POST .../admin/status` `{ kind, id | county+ref, status, verify? }`.

## Tables (migration `10_service_paths`)

`sp_areas`, `sp_sources`, `sp_points`, `sp_steps`, `sp_screening`, `sp_metrics`
(`area` is a county id or `finland`), `sp_findings`. The migration also adds the four
new rows to `counties` (owned by `regions`).

## Tests

```bash
npx vitest run service_paths/domain service_paths/seed   # pure: parser, compare, real seed files
encore test service_paths/                                 # endpoints, seed sync, admin rules
```
