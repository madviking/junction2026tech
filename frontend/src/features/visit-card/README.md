# visit-card

The resident's visit card at `/r/:lang/v/:code/card`, in the resident's language
(content from `WithLanguage`, all strings `ui.visit.*` in
`backend/care_paths/seed/ui/visit.yaml`).

Shows the anonymous visit code (large, grouped, read character by character to screen
readers) with "show this code or this screen at your visit", a link to the clinician
view `/clinic/<code>`, the next steps from the clinician's taps (`VisitView.nextSteps`,
refetched on window focus and with a refresh button), the resident's summary (selected
symptom cards, door, visit date, history as "stage question → answer" from the
`journey.*` content keys), an interpreter line when `interpreterNeeded` (not Finnish or Swedish), and
"Delete my data" (inline confirm, `DELETE /api/visits/:code`, then `/`).

| File | Role |
| --- | --- |
| `api/useVisitCard.ts` | `useVisitCard` (query `['visit-card', 'visit', code, lang]`), `useDeleteVisit` |
| `historyText.ts` | pure: one history item → localised text |
| `components/` | `VisitCodeBlock`, `NextStepsList`, `VisitSummary`, `DeleteVisitAction` (no fetching) |
| `VisitCardPage.tsx` | composes; loading, not-found and error states |
| `__fixtures__/network.ts` | test-only fetch stub and minimal content bundle |

Audio: `CardAudioButton` from `@/features/voice` for the code help (`ui.visit.code_help`)
and each next step (`card.clinician.<outcome>.next`); the screen works without it.

Test: `npx vitest run src/features/visit-card`; browser: `e2e/resident/visit.spec.ts`.
