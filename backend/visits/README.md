# visits

Anonymous visits. A resident gets a visit code (`SLT-XXXX-XXXX`, 40 random bits,
Crockford base32: no I, L, O, U; typed O/I/L are read as 0/1/1). There are no names, IDs,
phone numbers or e-mail addresses. Only HMAC-SHA256 of the code, keyed with the server
secret `VisitCodePepper`, is stored. If the secret is missing or empty, every code lookup
fails with `internal`; codes are never hashed without it. The code stays in the
resident's own URL, which is how they come back. A visit
expires 90 days after it was created.

The journey is an event log of taps. The state is always computed by replaying the
visit's `outcome` events through `care_paths/domain/journey.ts` with the **current**
live journey (`content.liveDoc()`). If content changed and an old event no longer fits,
that event is skipped and a warning is logged, so the visit keeps its last good state.

## Files

| File | Role |
| --- | --- |
| `visits.ts` | endpoints |
| `service.ts` | rules: code lookup, lane from symptom cards, clinician answers |
| `replay.ts` | pure replay of events → state, symptoms, answers |
| `views.ts` | pure builders of `VisitView` and `ClinicianSummary` |
| `code.ts` | code generation, normalisation, hash |
| `repository.ts` | SQL |

## Endpoints (all anonymous: whoever has the code can act on the visit)

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/api/visits` | `{ lang, county? }` (county default `helsinki`) | `VisitView` (the only place the new code is returned) |
| GET | `/api/visits/:code?lang=` | lang defaults to the visit's language | `VisitView` |
| POST | `/api/visits/:code/events` | `{ lang, outcome, symptoms?, duration?, route?, visitDate? }` | `VisitView` |
| GET | `/api/visits/:code/summary` | | `ClinicianSummary`, always Finnish |
| POST | `/api/visits/:code/clinician` | `{ answers: string[] }` | `ClinicianSummary` |
| GET | `/api/visits/:code/next-steps?lang=` | | `{ steps: { outcome, text }[] }` |
| DELETE | `/api/visits/:code` | | none; deletes the visit and its events |
| GET (internal) | `/internal/visits/county-counts?county=` | | `CountyCounts { total, byStage[], byOutcome[] }` |

An unknown, malformed or expired code returns `not_found`.

### Rules

- **Events.** The client never sends a lane. For an outcome whose structure has
  `sets: 'lane'`, the client sends symptom card ids (validated against `cards.symptoms`).
  The server picks the most urgent lane among them: lanes are ordered as in
  `structure.lanes`, and the first is the most urgent. An optional `duration`
  (`SYMPTOM_DURATIONS` id; how long the symptoms have lasted, said in the call script, never
  used for the lane) is accepted only with symptom cards. The server stores a `symptoms`
  event (`{ symptoms, lane, duration? }`) and then the `outcome` event. Symptom cards with any other outcome get
  `invalid_argument`. Interrupts (`emergency_sign`, `something_changed`) use the same
  endpoint. A `JourneyError` from the engine returns `invalid_argument`. `visitDate` is
  `YYYY-MM-DD`. The request `lang` also becomes the visit's language, which the summary
  uses for the interpreter line (`interpreterNeeded()` in `care_paths/domain/compose.ts`, re-exported by `views.ts`: not for Finnish or Swedish).
- **Clinician answers.** Answers are validated against `cards.clinician`, and each one is
  recorded as a `clinician_answer` event (actor `clinician`). On the first post of a
  clinician visit the journey moves once:
  - from a stage with an outcome leading to `cards.clinicianStage`, that outcome is applied
    (`wait` → `visit_today`);
  - from any other non-final stage, a `clinician_move` event (payload `{to}`) jumps to the
    clinician stage, keeping lane and route. `replay.ts` applies this event, because the
    engine has no jump input;
  - then the first chosen answer in the clinician stage's outcome order is applied.

  A final stage (`emergency`, `closed`) refuses a first post with `failed_precondition`.
  Posting again before the resident's next tap only adds answers.
- **Next steps.** Each distinct clinician answer gives one step, in the order the answers
  were first recorded. The text is `card.clinician.<outcome>.next` in the requested
  language, or English when that text is missing.
- **Summary flags.** These are the taps a clinician should know about, each with a count:
  a retry of the same stage, an escalation into a stage with a ladder, a step back before
  the visit, and interrupts.
- **Interrupts.** `VisitView.interrupts` lists what the engine's `availableInputs` allows,
  in `journey.interrupts` order. From `emergency` only `something_changed` is offered, and
  it leads back to `describe`.
- **VisitView.** All text is in the request language, with English as the fallback.
  `carePath` (from `compose`, using the language's profile and the symptom cards behind the
  lane, which the call script names) is filled once both lane and route are known. Ordered things are arrays.

## Tables (migration `6_visits`)

- `visits`: `id`, `code_hash` (unique), `lang`, `county`, `stage` (cache of the last
  replayed stage, used only for county counts), `created_at`, `expires_at` (+90 days).
- `visit_events`: `id`, `visit_id` (cascade delete), `at`, `actor`
  (`resident`|`clinician`), `kind` (`outcome`|`symptoms`|`clinician_answer`|`clinician_move`, migration 9), `stage`,
  `outcome`, `payload` jsonb. The payload holds codes only (symptom ids, lane, route,
  visit date, move target), never free text.

## Test

```bash
cd backend && encore test visits/
```
