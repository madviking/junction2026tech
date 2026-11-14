# regions

County view: fixed figures for a county plus anonymous visit counts from `visits`.
Only Helsinki is seeded.

## Endpoints

| Method | Path | Response |
| --- | --- | --- |
| GET | `/api/regions/counties/:id` | `CountyView { id, name, figures: { label, value, unit, year, source }[], topLanguages: string[], counts: { total, byStage: { lang, stage, count }[], byOutcome: { lang, stage, outcome, count }[] }, generatedAt }` |

An unknown county returns `not_found`. `year` is null where the source gives no single
year. `counts` comes from the internal `visits.countyCounts`; it holds no codes and no
timestamps.

## Tables (migration `7_county_figures`)

- `counties`: `id`, `name`.
- `county_figures`: `county_id`, `label`, `value` numeric, `unit`, `year`, `source`, `sort`.
- `county_languages`: `county_id`, `rank`, `language`, `source`.

Seed values are copied from the junction2026 brain sources
`sources/2026-11-13-hva-languages.md` (Statistics Finland 11rm, 2025) and
`sources/2026-11-13-az-county-indicators.md` (Sotkanet 3621, 3620, 6411; Cancer
Registry FIT 2024). The 80 % target comes from the National Cancer Strategy, Goal 2.
To change a figure, add a new migration.

## Test

```bash
cd backend && encore test regions/
```
