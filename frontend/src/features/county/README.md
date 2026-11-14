# county

`/county/:id` — `CountyPage` (lazy chunk, staff screen, English content; strings
`ui.county.*` in `backend/care_paths/seed/ui/county.yaml`). Data: `api.regions.county`,
refetched every 15 s and with a refresh button.

Shows the public figures as `StatTile`s (value + unit, year or "latest year", source),
the largest foreign languages, and the anonymous counts: total journeys, current stage
by language and outcomes by language (`DataTable` from `@/shared/ui/admin`; allowed
because this feature is lazy-loaded). Stage and language names come from
`ui.county.stage.*` / `ui.county.lang.*`, outcome names from the `journey.outcome.*`
content; unknown ids show as the raw id. Counts hold no codes or personal data.

Test: `npx vitest run src/features/county`; browser: `e2e/resident/visit.spec.ts` (g).
