# care_paths

Silta's care-path domain: the content model, the journey engine and care-path
composition. Port of the Python `app/care_paths` module to Encore.ts.

## What decides what

- **Lane** (urgency, `U0`–`U5`) + **route** (access, `A1`–`A8`) decide the destination,
  the Finnish call script and the clocks.
- **Profile** (communication, `C1`–`C7`, from the person's language) + **barriers**
  (`B1`–`B10`) only add adaptations and steps; a test enforces that they never change
  destination or clocks.
- **Journey** (`structure.journey`): which step comes next. After each stage the person
  taps one outcome card; `domain/journey.ts` computes the next state.
- The lane comes from content (symptom cards carry a lane; the letter and waiting
  outcomes set fixed lanes). No model ever sets a lane, a door or the emergency screen.

## Layout

```text
domain/      pure TypeScript, no I/O, no Encore imports; shared by content, visits, cards, voice
  types.ts     ContentDoc = structure + cards + texts (+ languages)
  keys.ts      the only place that derives text keys (lane.U2.name, journey.outcome.contact.no_answer.card ...)
  seed.ts      rules.yaml + cards.yaml + ui/*.yaml + texts.<lang>.yaml -> ContentDoc
  validate.ts  whole-document validation (seed time and every publish); errors block
  journey.ts   next(journey, codes, state, input) -> { state, thenKey, interrupt }
  compose.ts   one person's care path (door, scripts, clocks, adaptations, steps, review flags)
  export.ts    ContentDoc -> rules.yaml shape (English wording, Finnish scripts)
  texts.ts     text lookup with English fallback
  views.ts     ordered array views for API responses (Encore sorts object keys)
seed/        the seed files and load.ts (the only file reading the disk)
service.ts   endpoint rules: read the live document from content, compose
care_paths.ts endpoints
```

## Seed and runtime

`seed/rules.yaml` is the seed, not the runtime truth. On first use `content` validates it
and loads it as published version 1; the runtime reads the published version from the
database (`content_releases`). Unknown codes, stages or lanes fail loudly at seed time and
at publish time (`validate.ts`). All wording, English included, lives in `texts`; the
structure only holds codes, flags and links.

- Change wording: admin content editor (or the seed files on an empty database).
- Change the structure (a new stage, outcome or lane): edit `seed/rules.yaml`. While no
  admin has published, the next start publishes the changed seed as a new version;
  after admin edits only missing text keys are merged (see `content/service.ts`).
- Add a UI string: a `ui.<feature>.<name>` key in `seed/ui/<feature>.yaml` with `en` and
  `fi` (and `so`/`ar` placeholders). Outside production the backend re-checks the seed
  files at most every 5 s, so the key appears without a restart.

Changes to the seed's journey draft (14 Nov): `door_known` has `sets: route`,
`not_sure` has `sets: route_if_unknown` (was a then-text naming the if-unknown door), and
the stalled outcomes that climb the ladder have `climb: true`.

## Endpoints

- `GET /api/care-paths/options?lang=` → `CarePathOptions` (lanes, routes, profiles,
  barriers with wording, in display order).
- `POST /api/care-paths/compose` `{ lane, route, lang, profile?, barriers? }` →
  `CarePath`. Unknown codes → invalid argument.

Owns no tables.

## Tests

```bash
npx vitest run care_paths/      # pure domain, no database (journey, validate, seed, export, compose)
encore test care_paths/         # same through Encore
```

The journey tests are generated from the seed: every stage and outcome, reachability of
`closed` from every non-terminal stage, interrupts from every stage.
