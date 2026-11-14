Status: active
Last reviewed: 2026-11-14

# First working version of Silta (overnight build)

Orchestrator memory for the unattended overnight build. If context is compacted,
re-read this file first.

## Goal

A locally running, browser-proven vertical slice the team can extend: resident
journey (language, describe, route, door + Finnish script, outcome cards incl.
unhappy branches, audio), visit (Finnish summary, clinician answer cards, next
steps), county (Helsinki figures + anonymous counts), admin (sign-in, content,
audio, versions, usage, audit). Phase 4 journey editor only if all of that is proven.

## Scope

- In: everything above, local only (backend :8300, frontend :5300).
- Out: deployment, Aiven, images, deploy files, real EHR, accounts for residents.

## Architecture (contracts)

### One versioned content document

`content` owns `content_releases` (draft / published / archived rows, `doc jsonb`)
and `content_live` (pointer to the live published release). The document:

```text
ContentDoc {
  schemaVersion: 1
  structure: rules.yaml without wording: lanes, routes, profiles, barriers (codes,
             flags, step stages), rules (lane, route, clock basis), journey
             (start, interrupts, facts, stages, outcomes: next / sets / max_tries ...)
  cards:     symptom cards (id, lane, area), clinician answer cards (id, next step)
  texts:     key -> lang -> { text, review: unchecked|checked, reviewer?, reviewedAt? }
}
```

- All wording, English included, lives only in `texts`. Keys are derived from the
  structure path (`lane.U2.name`, `rule.U2.A5.title`, `journey.outcome.contact.no_answer.card`,
  `card.symptom.lump`, `ui.*`). `care_paths/domain/keys.ts` is the only place that
  derives keys.
- Seed: `backend/care_paths/seed/rules.yaml` (+ `seed/cards.yaml`, `seed/texts.*.yaml`)
  is validated and loaded as published version 1 on first use (`ensureSeeded`).
- Publish validates the whole draft (`care_paths/domain/validate.ts`); invalid → refused,
  live unchanged. Rollback re-points live to an earlier release. Export writes the
  live release back to the rules.yaml shape.
- Audio is not in the document: `voice` stores blobs keyed by text hash + lang + voice,
  so a text change makes old audio stale automatically.

### Journey engine

`care_paths/domain/journey.ts`: `next(journey, state, input) -> { state, then? }`, pure,
no I/O. `visits` replays and appends events through it.

### Services

| Service | Owns | Public surface |
| --- | --- | --- |
| `care_paths` | domain library (types, keys, seed, validate, engine, compose, export) | `GET /api/care-paths/options`, `POST /api/care-paths/compose` |
| `content` | `content_releases`, `content_live` | `GET /api/content/live?lang=`; admin: texts, review, versions, publish, rollback, export |
| `visits` | `visits`, `visit_events` | create visit (code), events (engine), summary (fi), clinician answers, next steps |
| `regions` | `county_figures` | `GET /api/regions/county/:id` (figures + anonymous counts from visits) |
| `cards` | none | `POST /api/cards/match` (free text / transcript → card via `llm.decide`) |
| `voice` | `audio_blobs`, `audio_assets`, `voice_usage` | audio by key+lang, STT, admin audio |
| `llm` | `llm_usage` | internal `complete`, `decide`; OpenRouter + Gemini adapters + fake |
| `admin` | `admin_users`, `admin_sessions`, `audit_log` | auth handler, sign-in/out, usage, audit |

## Owners and file slices

| Slice | Owner | Paths | Migration | Status |
| --- | --- | --- | --- | --- |
| P0 foundation | orchestrator | `backend/care_paths/**`, `backend/content/{content,service,repository}.ts`, `backend/admin/{auth,admin,service,repository}.ts`, `backend/lib/` | 3, 4 | done (79+10 tests, local-api proof) |
| P1 design system | agent `design-system` | `frontend/src/shared/ui/**`, `frontend/src/features/design-system/**`, `frontend/src/app/**`, `frontend/eslint-rules/no-raw-styles.js` | — | done: 82 tests, lint rule, screenshots reviewed by orchestrator (`docs/proof/2026-11-14/design-system-*.png`) |
| S1 llm + cards | agent `llm-cards` | `backend/llm/**`, `backend/cards/**` | 8 | done: classifier eval 36/36 confirms correct, 4/4 vague → choose (`docs/proof/2026-11-14/classifier-eval.md`) |
| S2 voice | agent `voice` | `backend/voice/**` | 5 | done: 15 tests (agent run), live TTS en/fi/so/ar + STT en/fi; orchestrator rerun pending |
| S3 visits + county | agent `visits` | `backend/visits/**`, `backend/regions/**` | 6, 7 | done: 9 tests, curl journey on :8300 |
| S4 content admin | agent `content-admin` | `backend/content/admin*.ts`, `backend/content/admin*.test.ts` | — | done: 15 content tests (agent run), local-api read-only proof; orchestrator rerun pending |
| Backend suite | orchestrator | full `encore test` | — | 152 tests: 147 pass + 5 live-only skipped (after one order-dependence fix in content.test.ts) |
| Orchestrator glue | orchestrator | `make api`, `admin/usage.ts`, `frontend/src/shared/i18n/**`, feature stubs + routes, voice contract stub, `playwright.config.ts`, lint boundary rule | — | done |
| F1 language + journey | agent `fe-journey` | `features/language/**`, `features/journey/**`, `seed/ui/{language,journey}.yaml`, `e2e/resident/journey.spec.ts` | — | done: 17 unit tests; Playwright 6/6 rerun by orchestrator (a, b, c, d, f + unknown code) |
| F2 voice | agent `fe-voice` | `features/voice/**`, `seed/ui/voice.yaml`, `e2e/resident/voice.spec.ts` | — | done: 9 unit tests; Playwright 2/2 (e) in the full run |
| F3 visit card, clinician, county | agent `fe-visit` | `features/{visit-card,clinician,county}/**`, `seed/ui/{visit,clinician,county}.yaml`, `e2e/resident/visit.spec.ts` | — | done: 7 unit tests; Playwright 4/4 rerun by orchestrator (clinician → next steps, delete, (g) county) |
| F4 admin | agent `fe-admin` | `features/admin-*/**`, `app/admin/**`, `app/adminRoutes.tsx`, `e2e/admin/**` | — | done: 6 unit tests; Playwright 4/4 ((h), (i), (j), screen tour) in the full run |
| design-system split | agent (sonnet) | `features/design-system/**` | — | done (policy line limit green) |
| P3 proof | orchestrator | full Playwright, readiness gate, review | — | final: Playwright 18 passed + 1 skipped (editor, flag off); gate 8/8; review findings fixed or listed |
| P4 journey editor | agent `journey-editor` | `backend/content/admin_journey*.ts`, `backend/content/features.ts`, `features/admin-journey/**`, `app/features.ts`, `shared/ui/extra/ColumnBoard*` | — | done, proven with flags on, shipped OFF |

Contracts every slice follows:
- Live document: internal `content.liveDoc()` → `{ releaseId, version, docJson }` (JSON text keeps key order; parse and cache by `releaseId`).
- Admin endpoints: `auth: true`, first line `requireAdmin()` (`backend/lib/admin_actor.ts`), then `admin.recordAudit({ actor: email, action, target, detail })`.
- Ordered data in responses goes in arrays (Encore's encoder sorts object keys).
- Spend caps enforced in code: llm $3, voice $5 (sum ≈ 7.6 EUR < 8 EUR cut-off); `providers.config.ts` in each service can force `fake`.
- Only the orchestrator runs `make api`.

## Acceptance matrix

Proof levels: unit = automated tests; local-api = real requests to the running backend;
browser = Playwright against the running app (resident 375 px, admin 1280 px). Screenshots
in `docs/proof/2026-11-14/`.

| # | Requirement | Implementation | Automated check | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| 0 | Servers start; health page in browser | existing + `make secrets` | smoke.spec | browser; clean-copy `make setup` + `make dev-backend` (:8302) + vite (:5302) healthy | done |
| P0.1 | care_paths ported to Encore; rules.yaml is the seed, loaded as published v1; runtime reads DB | `backend/care_paths`, `backend/content` | domain + content tests | local-api `/api/content/live` (v1 seeded on first use) | done |
| P0.2 | Unknown codes/stages/lanes fail loudly at seed and publish | `domain/validate.ts`, `seed.ts` | validate.test, content.test, admin.test | invalid publish refused, live unchanged | done |
| P0.3 | Journey engine pure `next(state, outcome)`; tests first; every stage/outcome covered; every non-terminal stage reaches closed; interrupts from every stage | `domain/journey.ts` | journey.test (58, generated from the seed) | unit | done |
| P1 | Design system: tokens, ≤6 text styles, primitives, RTL, focus, AA contrast, /design-system, lint enforcement, reviewed screenshot | `frontend/src/shared/ui`, `eslint-rules/no-raw-styles.js` | contrast + primitives + lint-rule tests | `design-system-375/1280.png` reviewed by orchestrator | done |
| 1a | Resident happy path: language → describe → route → door + Finnish script → outcomes → next steps | features/language, journey, visit-card | journey.spec (a), visit.spec | browser | done |
| 1b | Nobody answered twice → stalled → escalation ladder | engine + StalledStage | journey.spec (b), journey.test | browser | done |
| 1c | Emergency interrupt from a mid-journey stage (and a way back; offline-safe screen) | engine + EmergencyStage | journey.spec (c), (c2) | browser | done |
| 1d | Free text mapped to a card, read back and confirmed; low confidence → cards | cards service + MatchInput | journey.spec (d), cards tests, eval 36/36 + 4/4 choose | browser; `classifier-eval.md` | done |
| 1e | Card audio loads and plays; recorded answer (fixture audio as microphone) mapped to a card and read back | voice service + features/voice | voice.spec (e1, e2) | browser (fixture fed through Web Audio; see decision 18) | done |
| 1f | Arabic right-to-left | i18n layer + logical CSS | journey.spec (f) | browser `journey-arabic.png` | done |
| 1g | Every card and instruction can be played aloud | CardAudioButton everywhere a content key exists | voice + journey tests | composed texts (title with {door}, clock limit lines, code line) have no audio | partial |
| 2 | Visit: Finnish one-screen summary, clinician answer cards, resident next steps | visits service, features/clinician, visit-card | visit.spec, visits tests | browser `clinician-*.png`, `visit-card.png` | done |
| 3 (g) | County: Helsinki figures + anonymous counts by stage/outcome/language; counts change after a journey | regions + visits counts, features/county | visit.spec (g) | browser `county.png` | done |
| 4.1 (j) | /admin requires sign-in (redirect) | auth handler, guard | guard.spec, admin tests | browser | done |
| 4.2 | Seeded admins, hashes only, creds only in seed file | `admin/seed/admin-users.local.yaml`, scrypt | admin tests | local-api | done |
| 4.3 (h) | Edit text → publish → resident sees it → rollback → old text returns | content admin + admin-content | publish-rollback.spec | browser | done |
| 4.4 | Review status per language; filters needs review / missing | admin_texts + ContentPage | admin.test, screens.spec | browser `admin-content-*.png` | done |
| 4.5 (i) | Audio: listen, generate, upload, approve; human wins; text change → stale | voice admin + admin-audio | audio-approve.spec, voice tests | browser | done |
| 4.6 | Versions, rollback, export to rules.yaml; journey structure versioned | content service | content tests (export round trip) | export not clicked in browser (endpoint proven) | done |
| 4.7 | Usage page by provider, feature, day | `admin/usage.ts` + admin-usage | screens.spec | browser `admin-usage.png` | done |
| 4.8 | Audit of every admin write | `admin.recordAudit` from every admin endpoint | admin/content/voice tests | audit table on usage page | done (audit row written after the change, not in its transaction: open) |
| LLM | OpenRouter + Gemini adapters, per-integration switch, live smoke each | `backend/llm` | llm tests + live smoke | usage rows | done |
| LLM.decide | Gemini Decision 1 via Decisions endpoint, probabilities, usage row per call | `llm.decide` | decide tests | live smoke + eval | done |
| Voice | TTS stored by text hash (never twice), long cache; STT discarded; capability table; Somali cards first | `backend/voice` | voice tests | live round trip en/fi/so/ar; STT fixture transcribed | done |
| Privacy | No names/identifiers to providers; code hashed (HMAC + pepper); recordings/transcripts not stored | cards/redact, visits/code, voice | redact + visits + voice tests | review checked | done |
| Gate | `bash dev_readiness_check.sh --all` | — | 8/8 steps | run after review fixes | done |
| P4 | Journey editor: graph of the draft, validation + review flags, add/remove stage/outcome, change next; invalid draft cannot publish; behind an OFF flag | `backend/content/admin_journey*.ts`, `features/admin-journey`, flags `SILTA_FEATURE_JOURNEY_EDITOR` / `VITE_FEATURE_JOURNEY_EDITOR` | admin_journey.test (10), feature tests (10), journey-editor.spec (skips when off) | browser with flags on (`journey-editor-*.png`); shipped OFF: route not registered, endpoints refuse | done (off) |

## Independent review (Phase 3) and what was done

A review agent got the code and the goal only. Findings and disposition:

| # | Sev | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | high | At the spend cap, voice/LLM silently switched to fakes (fake transcript "lump", beeps) | fixed: live mode at cap → `unavailable`, UI falls back to cards; fakes only in `mode: 'fake'` |
| 2 | high | A seed change could overwrite admin-published content via a merge release made "by the seed" | fixed: merge releases use actor `seed-merge`; only pure-seed live content follows seed files |
| 3 | high | One tap on emergency ended the visit for good; emergency screen needed a server round trip | fixed: `something_changed` leads out of emergency; emergency screen shows at once and stays offline (journey.spec c, c2) |
| 4 | high | Clinician answers refused unless the resident sat at visit/wait | fixed: `clinician_move` event from any non-terminal stage (migration 9) |
| 5 | med | Names could reach the LLM provider | fixed: self-introduction and street-address redaction (en/fi/so/ar), tests |
| 6 | med | Visit code hash unsalted (40-bit); code in URLs | fixed: HMAC-SHA256 with secret `VisitCodePepper`; code stays in the resident's own URL (decision: it is how they come back) |
| 7 | med | iOS Safari records audio/mp4, backend refused it | fixed (ftyp check) |
| 8 | med | Admin: seed users with no production guard, no throttle, failed sign-ins not audited, user enumeration by timing; audit outside the write transaction | fixed except the transaction (production guard, 5 failures / 15 min throttle, failed sign-ins audited, dummy scrypt). Audit-in-transaction: open |
| 9 | med | Some instructions had no play button; composed texts cannot map to one clip | partly fixed (start page, clock labels, door note); composed texts: open |
| 10 | med | Generated Arabic audio marked approved while Arabic texts are placeholders | fixed: generated Arabic audio starts unchecked (approvable by an admin) |
| 11 | low | Anonymous endpoints without rate limits; county counts of 1 shown | open (next steps) |
| 12 | low | Duplicated liveDoc cache in 4 services, frontend re-derives keys, hard-coded RTL list, unused `shared/api/generated/openapi.ts` | code normalisers unified (`frontend/src/shared/visitCode.ts`); rest open (next steps) |

## Spend

Actual, from the usage tables (dev database) plus the live smoke/eval rows written to the
Encore test database. All amounts USD; EUR ≈ USD × 0.93.

| Provider | Calls | Volume | Cost (USD) | Note |
| --- | --- | --- | --- | --- |
| ElevenLabs (TTS + STT) | 19 | 181 characters, 17.2 s audio | 0.0154 | eleven_v4 TTS, scribe_v3 STT; one rejected junk STT request logged at 0 |
| OpenRouter (Gemini Decision 1, flash-lite) | 20 | 6,710 tokens | 0.0007 | card matching from the app and browser tests |
| OpenRouter + Gemini direct (smoke + 40-item eval, test DB) | 46 | ~15.8K tokens | 0.0016 | one live call per adapter; eval run once |
| **Total** | 85 | | **≈ 0.018 USD (≈ 0.02 EUR)** | limit 10 EUR, cut-off 8 EUR never approached |

## Decisions made overnight

1. Project root is `junction2026/tech`; brain notes at `junction2026/brain`.
2. The dev servers on :8300/:5300 were already running from another desktop session and
   could not be stopped from here; work uses them (Encore and Vite both hot-reload).
3. Local secrets: `backend/.secrets.local.cue` (gitignored) generated from `.env`
   (`GeminiApiKey`, `OpenRouterApiKey`, `ElevenLabsApiKey`); mapped in `infra.config.json`.
4. `yaml@2.9.1` added to the backend (2.8.1 had a moderate advisory; 2.9.1 audits clean).
5. One versioned content document (structure + cards + texts) instead of separate
   versioned tables: publish, rollback and export stay atomic, and Phase 4 edits the
   same `structure` without a storage change.
6. Encore quirks found: no `typeof X[number]` types; `db` only in direct calls (every
   repository function takes a transaction); the JSON encoder sorts object keys (hence
   `docJson` internally and array views publicly); in-process calls bypass the auth
   gateway (hence `requireAdmin()` in every admin endpoint).
7. The running `encore run` (other session) hot-reloads code but does not apply new
   migrations; pending migrations were applied to the local dev DB with a scratch helper
   that mirrors Encore's migrator (SQL as `encore-migrator`, then bump `schema_migrations`).
8. Local test admins: `backend/admin/seed/admin-users.local.yaml` (random local passwords,
   hashed with scrypt on first use; bearer sessions, 12 h). Token kept in the admin UI's
   sessionStorage (UI convenience, not product data).
9. Voice: one TTS model for all four languages (`eleven_v4`, voice George); STT `scribe_v3`.
   Generated Somali audio cannot be approved; Somali becomes approved only through a human
   recording. en/fi/ar generated audio counts as approved by policy (pronunciation not yet
   listened to by a person).
10. Backend test files run sequentially (`fileParallelism: false`): they share one test database.
11. LLM: OpenRouter is the default provider for every integration; completions use
    `google/gemini-3.1-flash-lite` (2.5-flash is deprecated), decisions use
    `google/gemini-decision-1`. Gemini direct proven with one live call each.
    Classifier guard rails: confidence ≥ 0.55 and margin ≥ 0.15, else show the cards.
12. Visits: code is Crockford base32, 40 bits, stored as sha256; the lane is derived on
    the server from the chosen symptom cards (most urgent lane wins), never sent by the client.
13. Seed files are re-checked every 5 s outside production, so new `ui.*` strings appear
    without a backend restart (seed-only versions are added as new published versions).
14. Frontend: `@/shared/ui/admin` holds admin-only primitives; resident features may not
    import it (lint); the lazy county and design-system screens may.
15. Seed YAML: unquoted commas in flow mappings had silently cut 7 texts (3 inherited from
    the original rules.yaml: B1/B6 step details, the U5 "Suspected cancer, referral to
    treatment" clock). Quoted them, fixed fi/so/ar, and the seed loader now rejects unknown
    language keys in ui files.
16. Reseed rule: live content made by the seed follows seed edits even after an admin
    publish + rollback.
17. Clinician view is reached by the code (`/clinic/<code>`); no QR code tonight (no new
    dependency).
18. Fake microphone: Chrome's own fake audio capture never starts on this Mac (the host
    app has no macOS microphone permission), so the voice spec plays the WAV fixture into
    `getUserMedia` through Web Audio; MediaRecorder, upload, speech-to-text and matching
    are real. `E2E_CHROME_FAKE_MIC=1` uses Chrome's capture where it works.
19. The admin audio test (i) leaves approved human test recordings on the English lump
    card; they were deleted from the local dev DB after the run (synthetic test rows).
20. Visit date: outcomes with `records: visit_date` now ask for the date (optional).
21. The brain's service-paths note replaced urgency lanes with situations; this build
   ports `rules.yaml` as written (lanes), because the overnight brief says to port it.
   Symptom cards carry a lane from content (clinical review flag); the classifier
   never sets a lane.

## Morning report (2026-11-14, ~05:40)

### What works, with proof level

| Area | Proof | Where to look |
| --- | --- | --- |
| Resident journey: language → describe (cards, free text, voice) → route → door + Finnish script + time limits → outcome cards incl. nobody answered ×2 → stalled → ladder, wrong place, emergency from any stage (and back), visit date | browser (375 px) | `frontend/e2e/resident/journey.spec.ts`, `docs/proof/2026-11-14/journey-*.png` |
| Free text / transcript → card with read-back; vague → cards stay | browser + live eval (36/36 confident correct, 4/4 vague → cards) | `docs/proof/2026-11-14/classifier-eval.md` |
| Audio: every card/instruction with a content key plays; recorded answer → transcript → card → read-back | browser (fixture audio as microphone) | `voice.spec.ts`, `voice-*.png`, `docs/proof/2026-11-14/voice.md` |
| Arabic right-to-left; Somali/Arabic marked unchecked | browser | `journey-arabic*.png` |
| Visit: Finnish one-screen clinician summary, answer cards (from any stage), resident next steps; delete my data | browser | `visit.spec.ts`, `clinician-*.png`, `visit-card*.png` |
| County (Helsinki): figures with sources, anonymous counts by stage/outcome/language that change after a journey | browser | `county.png` |
| Admin: sign-in guard, content + translations with review status and filters, draft → validated publish → rollback, export, audio generate/upload/approve (human wins), usage by provider/feature/day, audit | browser (1280 px) | `frontend/e2e/admin/*.spec.ts`, `admin-*.png` |
| Journey editor (Phase 4) | browser with flags on; shipped OFF | `journey-editor-*.png`, `frontend/src/features/admin-journey/README.md` |
| Design system + lint enforcement | unit + reviewed screenshots | `/design-system`, `frontend/src/shared/ui/README.md` |
| Clean checkout: `make setup` → `make dev-backend` + vite start and serve | local (copy on :8302/:5302) | this plan, decision list |

### Commands run (final state)

| Command | Result |
| --- | --- |
| `cd backend && encore test` | 170 passed, 5 skipped (live smoke/eval, opt-in) |
| `cd frontend && npx vitest run` | 137 passed (20 files) |
| `cd frontend && npx playwright test` | 18 passed, 1 skipped (journey editor; flag off) |
| `bash dev_readiness_check.sh --all` | OK, 8/8 (policy, backend typecheck, backend tests, API client, frontend lint, typecheck, tests, build) |
| `make setup` + `make dev-backend` + `vite` in a clean copy | healthy, content and visits served |
| `npm audit` frontend | 7 moderate, all in existing lint tooling (`typescript-eslint`); not touched (no frontend dependency added tonight) |
| `npm audit` backend | 0 (added `yaml@2.9.1`) |

### Paid spend

≈ 0.018 USD (≈ 0.02 EUR) of the 10 EUR limit; details in "Spend" above. The 8 EUR cut-off was never
approached; in live mode a reached cap now refuses calls instead of faking them.

### Stubbed or not built

- Overdue clocks and check-ins (`wait`/`followup` `check_ins`, `overdue`) are in the structure but
  nothing fires them; the person taps the outcome.
- No QR code for the visit card (the clinician types the code or opens `/clinic/<code>`).
- Audio for texts composed from several pieces (destination title with the door, clock limit
  lines, the code line) — no single content key, so no clip.
- County small-number suppression and rate limits on anonymous endpoints.
- Only Helsinki county figures.

### Broken or open

- Nothing in the gate or the browser suite is failing.
- Admin audit rows are written after the change, not in the same transaction (a failed audit
  write leaves an unaudited change).
- The admin audio browser test (i) leaves an approved test recording on the English lump card;
  it was deleted from the local dev database after each run. Make the test clean up (or add an
  admin "remove recording" action).
- `frontend/src/shared/api/generated/openapi.ts` is an unused older contract (from the base
  commit); `backend/app/` + `backend/tests/` are the superseded Python care_paths module. Both
  left in place for the team to delete.
- The dev servers on :8300/:5300 were started by another desktop session; this session could not
  restart them, so migrations 3–9 were applied with a scratch helper. A fresh `make dev-backend`
  applies them itself (proven in the clean copy).
- Nothing is committed: all work is in the working tree (41 modified, 1 deleted
  `frontend/src/app/AppLayout.tsx`, 119 new paths). Suggested review order: `docs/planning/`,
  `backend/care_paths`, `backend/content`, then the rest.

### Phase 4

Reached. The journey editor is built and proven in the browser with both flags on, and ships
with both flags OFF (no route, no nav entry, endpoints refuse). Turn on with
`SILTA_FEATURE_JOURNEY_EDITOR=true` (backend) and `VITE_FEATURE_JOURNEY_EDITOR=true` (frontend).

### Next five things worth doing

1. Native-speaker review of Somali and Arabic texts and audio (and listen to the Finnish audio);
   then mark them checked in `/admin/content` and approve audio in `/admin/audio`.
2. Clinical and legal review of the flagged lanes, routes and outcomes (`/admin/content` → Review
   flags); the content still carries the draft 14 Nov journey.
3. Rate limits on anonymous endpoints (`/api/voice/clip` generation, `/api/voice/transcribe`,
   `/api/visits`) and county small-number suppression; audit rows in the same transaction.
4. Check-in and overdue reminders (`check_ins`, `overdue`) and a QR code on the visit card.
5. Before any deployment: replace the local admin seed with real admin provisioning, set
   `VisitCodePepper` and provider secrets in the environment, delete the old Python module and
   the unused `openapi.ts`, and decide on the brain's "situations instead of urgency lanes" change.
