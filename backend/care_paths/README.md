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
  seed.ts      rules.yaml + cards.yaml + ui/*.yaml + glossary.yaml + texts.<lang>.yaml -> ContentDoc
  glossary.ts  Finnish health care vocabulary: answer cards, transcript correction, STT key terms
  validate.ts  whole-document validation (seed time and every publish); errors block
  journey.ts   next(journey, codes, state, input) -> { state, thenKey, interrupt }
  compose.ts   one person's care path (door, scripts, full call script, clocks, adaptations, steps, review flags)
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
  `fi` (and `so`/`ar` placeholders; the other languages keep their texts, `ui.*` included,
  in `seed/texts.<lang>.yaml`). Outside production the backend re-checks the seed
  files at most every 5 s, so the key appears without a restart.
- Add a health care word: four keys in `seed/glossary.yaml` (same format as `ui/*.yaml`):
  `glossary.<id>.term` (the word in Finnish and in the person's language), optional
  `.heard` (speech-to-text mishearings, `;`-separated, lower case, whole words, e.g.
  "kellogg card"), `.question` and `.answer` (plain language, ends with what to say or
  do). `glossary.*` are free keys (English required). They reach admin-edited content
  through the normal missing-key merge. Used by `cards` (answer cards next to every card
  set, mishearings fixed before matching) and `voice` (key terms sent to speech-to-text,
  mishearings fixed in the transcript). Answers are general guidance and need the same
  review as every other text.

Changes to the seed's journey draft (14 Nov): `door_known` has `sets: route`,
`not_sure` has `sets: route_if_unknown` (was a then-text naming the if-unknown door), and
the stalled outcomes that climb the ladder have `climb: true`.

## Call script

`CarePath.callScript` is the whole phone call as ordered parts (`opening`, `symptoms`,
`request`, `they_ask`, `closing`); each line has the Finnish text, its meaning in the
person's language and the text key (audio). Texts: `step.call.*` in
`seed/ui/call_script.yaml` (all 14 languages). The `request` line is the lane/route rule
script; the U2/U3 rule scripts say "these symptoms" because the `symptoms` part lists the
tapped symptom cards (`compose` input `symptoms`, from the visit). Non-Finnish/Swedish
speakers get the interpreter lines; "Kieleni on …" is one finished sentence per language
(`step.call.my_language.<lang>`: en, fi and that language), so it has audio like the other lines.
A language without that key falls back to the `step.call.my_language` template (Finnish
language names in `compose.ts`), shown without audio. The emergency lane has only the 112 script.

How long the symptoms have lasted is a closed set (`keys.ts` `SYMPTOM_DURATIONS`: under 2
weeks, 2–4 weeks, 1–3 months, over 3 months), picked optionally with the symptom cards.
It never changes the lane. Picked → the `symptoms` part ends with `step.call.since.<id>`
("Ne alkoivat 2–4 viikkoa sitten.") and "when did they start?" leaves `they_ask`. The rule
scripts carry no `[N]` blank. Picker texts: `ui.journey.duration.*`.

## Care path steps

`CarePath.steps` is the person's path in order. Each step carries the journey `stage` it
belongs to, so the resident app can draw the path with "you are here" (frontend
`features/journey/pathSteps.ts`). `detail` is a design note (tone, adaptation) for staff
views; residents see only `text`.

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
