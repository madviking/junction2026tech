# care_paths

Silta's service-path engine: turns four choices into one person's care path.

- **Lane** (urgency, `U0`–`U5`) + **route** (access/entitlement, `A1`–`A8`) decide the
  destination, the Finnish call script and the clocks (legal / recommended / open).
- **Profile** (communication, `C1`–`C7`) + **barriers** (`B1`–`B10`) only add adaptations
  and steps. They never change destination or clocks; a test enforces this
  (`test_language_and_barriers_never_change_destination_or_clocks`).

## Routes

- `GET /api/care-paths/options` → `CarePathOptions` (all codes in display order).
- `POST /api/care-paths/compose` with `{lane, route, profile, barriers[]}` → `CarePath`
  (`destination`, `clocks`, `adaptations`, `steps`, `review_flags`, `emergency`).
  Unknown codes → 422.

## Data

- Decision tables live in `rules.yaml` (content reviewed by a clinician and someone
  checking the law), loaded and validated once by `rules.py`. Same file-based pattern
  as `app/llm/integrations/`. Edit the YAML, not the code, to change wording or rules.
- A rule with `route:` overrides the lane default for that route.
  `clocks_without_care_guarantee` replaces the clocks for routes with
  `care_guarantee: false`.
- `review_flags` surface unverified content: lanes with `needs_clinical_review`, routes
  with `needs_legal_review`.
- Owns no tables. Journey timestamps (county analytics) will need a table and a
  migration when they are built.
- Background and sources: junction2026 brain repo, `ideas/silta-service-paths.md`.

## Tests

`uv run pytest -q tests/care_paths` (no database needed).
