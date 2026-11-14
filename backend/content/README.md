# content

Versioned content document for Silta: the care-path structure, the cards and every
text in every language, with drafts, publish, rollback and export. Residents only ever
see the published (live) version; admins edit a draft.

## Files

```text
content.ts       public live endpoint + internal liveDoc
admin.ts         admin endpoints (/api/content/admin/*), thin
admin_texts.ts   admin rules: text rows, filters, labels, draft diff, review flags,
                 admin writes with their audit rows (no SQL)
service.ts       seed, live document, draft edits, publish, rollback, export
repository.ts    SQL for content_releases and content_live
```

The document model, text keys, validation and export live in `care_paths/domain`
(`types.ts`, `keys.ts`, `validate.ts`, `export.ts`); see `care_paths/README.md`.

## The content document

`ContentDoc` = `languages` (en, fi, so, ar; code, name, dir, placeholder, profile) +
`structure` (lanes, routes, profiles, barriers, rules, journey) + `cards` (symptom
cards, emergency signs, clinician cards) + `texts` (`key → lang → { text, review,
reviewer?, reviewedAt? }`). The structure holds codes, flags and links only; all
wording, English included, is in `texts`, under keys derived by `care_paths/domain/keys.ts`
(for example `journey.outcome.contact.no_answer.card`). Free keys `ui.*` and `step.*`
come from the seed's `ui/*.yaml`.

The document is stored and passed between services as JSON text, because Postgres
`jsonb` and Encore's JSON encoder both reorder object keys and the order of stages,
outcomes and cards is the order on screen.

## Seed, draft, publish, rollback

- **Seed.** On first use `ensureSeeded()` builds the document from
  `care_paths/seed/*` (rules.yaml, cards.yaml, ui/*.yaml, texts.<lang>.yaml),
  validates it and publishes it as version 1. When the seed files change later: if
  nobody but the seed has published, the new seed becomes a new version; otherwise only
  missing text keys are merged in (into the live version and the draft).
- **Draft.** There is at most one draft. The first edit copies the live version into a
  draft row (`based_on` = that release). Changing a text resets its review to
  `unchecked`. Audio clips (voice service) are keyed by a hash of the text, so the old
  clip simply stops matching and becomes stale; nothing to do here.
- **Publish.** Validates the draft (`validateDoc`). Any error refuses the publish with
  `invalid_argument` (details list the errors) and the live version stays unchanged.
  Otherwise the draft becomes a new published version (number = highest + 1), goes
  live, and the draft row is deleted.
- **Rollback.** Points `content_live` at an older published version. Versions are
  never deleted; the next publish still numbers from the highest version.
- **Export.** The live version in the rules.yaml shape (English wording, Finnish call
  scripts), for review outside the admin.

## Endpoints

Public:

- `GET /api/content/live?lang=` → `LiveBundle` `{ version, lang, dir, placeholder,
  languages[], texts (key → { text, lang, review, fallback }), journey (ordered view),
  cards, lanes[], routes[] }`. Missing texts fall back to English with `fallback: true`.
  Unknown language → `invalid_argument`.

Internal:

- `GET /internal/content/live-doc` → `{ releaseId, version, docJson }` for care_paths,
  visits, cards and voice (parse once per `releaseId`).

### Admin endpoints

All are `auth: true` and start with `requireAdmin()` (a signed-in admin from
`admin`'s auth handler; anonymous calls → `unauthenticated`). Every write records an
audit row through `admin.recordAudit` (actor = admin email). English only. Ordered
data is always in arrays.

| Method, path | Request | Response | Audit action, target |
| --- | --- | --- | --- |
| `GET /api/content/admin/texts` | `{ lang?, filter?: 'all' \| 'needs_review' \| 'missing', search?, group? }` | `TextsResponse` | — |
| `PUT /api/content/admin/texts` | `{ key, lang, text }` | `DraftSummary` | `content.text.update`, `<key>/<lang>` |
| `POST /api/content/admin/review` | `{ key, lang, status: 'checked' \| 'unchecked' }` | `DraftSummary` | `content.review.update`, `<key>/<lang>` |
| `GET /api/content/admin/draft` | — | `DraftDetail` `{ summary, issues[], docJson }` | — |
| `POST /api/content/admin/publish` | `{ note? }` | `ReleaseInfo` | `content.publish`, `v<version>` |
| `POST /api/content/admin/discard` | — | `DraftSummary` | `content.draft.discard`, `draft` |
| `GET /api/content/admin/versions` | — | `{ versions: ReleaseInfo[] }` (newest first) | — |
| `POST /api/content/admin/rollback` | `{ version }` | `ReleaseInfo` | `content.rollback`, `v<version>` |
| `GET /api/content/admin/export` | — | `{ version, yaml }` | — |
| `GET /api/content/admin/review-flags` | — | `{ flags: { kind: 'clinical' \| 'legal', path, message }[] }` | — |

Types (in `admin_texts.ts` and `service.ts`):

- `TextsResponse` = `{ draftExists, basedOnVersion, languages: { code, name, placeholder }[],
  rows: TextRow[] }`. Rows come from the draft (or the live version when there is no
  draft) in structure order: the keys `structureKeys()` derives (lanes, routes,
  profiles, barriers, rules, interrupts, route questions, stages with their outcomes,
  symptom cards, emergency signs, clinician cards), each optional key right after its
  required sibling (an outcome's `then` after its `card`), then the free `ui.*` and
  `step.*` keys.
- `TextRow` = `{ key, group, label, required, entries[], changedInDraft }`. `group` is
  the key prefix (`lane`, `route`, `profile`, `barrier`, `rule`, `journey.stage`,
  `journey.outcome`, `journey.interrupt`, `journey.fact`, `card.symptom`,
  `card.emergency`, `card.clinician`, `ui`, `step`); `label` is a short English label
  such as `contact → Nobody answered · card`; `entries` has one
  `{ lang, text, review: 'unchecked' | 'checked' | 'missing', reviewer, reviewedAt }`
  per language in language order.
- Filters: `needs_review` = an entry with text that is unchecked in any language (or in
  `lang`). `missing` = a language without text (or `lang` without text); an optional key
  counts only when at least one language has a text for it. `search` matches key, label
  and any text, case-insensitive; `group` is an exact group.
- `DraftSummary` = `{ exists, basedOnVersion, errors, warnings, changedKeys[] }`.
  `changedKeys` are text keys whose entries (text or review) differ from the live
  version, that is what publishing would change.
- `ReleaseInfo` = `{ id, version, note, createdBy, publishedAt, live }`.
- `PUT /texts` refuses a key that is neither a structure key of the draft nor a free
  `ui.`/`step.` key (`invalid_argument`), and texts over 4000 characters. An empty text
  removes that language's entry (publish then refuses it if the key is required).
- Review flags come from the live structure: lanes with `needsClinicalReview`, routes
  with `needsLegalReview`, outcomes with `review`, and the route if-unknown review.

## Journey editor

Structural editing of `structure.journey` in the draft: add or remove a stage, add or
remove an outcome, change where an outcome leads. Behind a flag that is OFF by default:
`features.ts` reads `SILTA_FEATURE_JOURNEY_EDITOR=true` from the environment. With the
flag off `GET .../graph` returns `{ enabled: false }` with empty lists and every write is
refused with `failed_precondition` ("journey editor is disabled").

Files: `admin_journey.ts` (pure edits on a `ContentDoc` and the graph view),
`admin_journey_api.ts` (endpoints, `currentGraph()`, `applyJourneyEdit()`),
`features.ts` (flag), `admin_journey.test.ts`.

| Method, path (`/api/content/admin/journey/…`) | Request | Audit action, target |
| --- | --- | --- |
| `GET graph` | — | — |
| `POST stage` | `{ id, terminal?, askEn, askFi }` | `content.journey.stage.add`, `<id>` |
| `POST stage/remove` | `{ id }` | `content.journey.stage.remove`, `<id>` |
| `POST outcome` | `{ stage, id, next, cardEn, cardFi }` | `content.journey.outcome.add`, `<stage>.<id>` |
| `POST outcome/remove` | `{ stage, id }` | `content.journey.outcome.remove`, `<stage>.<id>` |
| `POST outcome/next` | `{ stage, id, next }` | `content.journey.outcome.next`, `<stage>.<id>` |

Every endpoint returns `JourneyGraph` = `{ enabled, source: 'draft' | 'live',
basedOnVersion, start, stages: { id, terminal, ask (en), ladder, outcomes: { id, card (en),
next, sets, setsLane, review, maxTries, afterMax, climb }[] }[], interrupts: { id, card,
next }[], issues: ValidationIssue[], reviewFlags: { kind, path, message }[] }`, all in
document order. `issues` is the same `validateDoc()` that publish runs.

Rules:
- Ids match `[a-z][a-z0-9_]{1,40}`; duplicates are refused (`already_exists`); an outcome
  id must not be an interrupt id. New stages go before `closed`.
- A new non-terminal stage needs its question in English and Finnish; a new outcome needs
  its card in English and Finnish (both `unchecked`). Other languages and the optional
  `then` text are edited in the text editor.
- An unknown `next` is kept in the draft on purpose: `issues` shows it as an error and
  publish refuses the draft until it is fixed.
- Removing `closed`, the start stage, or a stage that anything else still names (another
  stage's outcome `next`/`after_max`/overdue, an interrupt, the route question stage, the
  clinician stage) is refused with `failed_precondition`, listing those paths. Removing a
  stage or outcome also deletes its texts. Clinician answer-card outcomes cannot be removed.

Tests: `encore test content/admin_journey.test.ts` (pure edits, graph, flag refusal,
edit → issue → publish refused → fix → audit).

## Tables

- `content_releases` (migration 3): one row per published version (`version` 1, 2, …)
  plus at most one draft (`version` NULL, `status = 'draft'`). `doc` is TEXT holding
  the JSON document; `based_on` links a draft or release to the release it came from;
  `seed_fingerprint` marks seed-made releases.
- `content_live` (migration 3): a single row pointing at the live release.

Only this service writes them.

## Test

```bash
cd backend && encore test content/      # content.test.ts + admin.test.ts
```

`admin.test.ts` runs against Encore's test database without mocks: it checks that every
admin endpoint rejects anonymous calls, row order, groups and labels, the
`needs_review`/`missing` filters, the draft diff, that an invalid draft is not published
(live bundle unchanged), that rollback restores the old text, and the audit rows. Signed-in
calls cannot go through the gateway in tests, so the logic is tested through
`admin_texts.ts`.

Manual check against the dev backend: sign in with `POST /api/admin/sign-in`, then call
the admin endpoints with `Authorization: Bearer <token>`.
