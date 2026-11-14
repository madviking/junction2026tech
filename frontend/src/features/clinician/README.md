# clinician

Staff screens, always Finnish (route wraps them in `WithLanguage lang="fi"`; strings
`ui.clinician.*` in `backend/care_paths/seed/ui/clinician.yaml`, `fi` primary).

- `/clinic` — `ClinicianLookupPage`: type a visit code; `normalizeVisitCode` from `@/shared/visitCode` (shared with the journey; mirror of
  `backend/visits/code.ts`) accepts case, spaces, dashes, a missing `SLT` prefix and
  O/I/L for 0/1/1, then opens `/clinic/<canonical code>`.
- `/clinic/:code` — `ClinicianPage`: `api.visits.summary` on one screen (interpreter
  banner when needed, situation, symptoms, route and door, visit date, history, flags),
  then the answer cards (multi-select `ChoiceCard`s). Confirm posts only the newly
  chosen outcomes, in card order, to `api.visits.clinicianAnswers`; the response
  replaces the cached summary and a success banner says the next steps were sent.
  Cards already sent stay selected and locked (the backend only adds answers).

| File | Role |
| --- | --- |
| `api/useClinicianSummary.ts` | query `['clinician', 'summary', code]`, answers mutation |
| `components/` | `SummaryPanel`, `AnswerCards`, `CodeLookupForm` |
| `@/shared/visitCode` (shared with the journey) | pure code normalisation (+ test) |

Test: `npx vitest run src/features/clinician`; browser: `e2e/resident/visit.spec.ts`.
