Status: active
Last reviewed: 2026-11-14

# "I got a letter": photo → explanation in the resident's language

## Goal

A resident who got a health care letter they cannot read takes a photo of it and sees, in
their own language, what the letter is, the appointment facts (when, where, deadline, phone)
and what to do next. Replaces the old entry that opened the cervical screening guide whatever
the letter was.

## Decisions (user, 14 Nov 2026)

- **Photo privacy: send, never store.** The photo goes through our backend to the LLM for one
  analysis, lives only for the length of the request, is never saved or logged. A consent line
  before the camera says so. The model is told not to return name, address or ID number; the
  service also masks anything shaped like a Finnish personal identity code.
- **Result: facts + plain summary.** Closed-set letter type plus extracted facts and a short
  generated explanation in the resident's language, labelled machine-made. Known types link on
  (cervical screening → the published guide; any letter → the symptom journey).

## Scope

- In: `llm.extract` (one image + JSON-schema output), `letters` service
  (`POST /api/letters/explain`), frontend feature `letter` (`/r/:lang/letter`), texts
  `ui.letter.*` in all 13 languages, start-screen entry card.
- Out: storing letters or results, linking a letter to a visit code, read-aloud of the
  generated summary (audio is generated per published text key only), multi-page letters,
  county counts of letter types.

## Owners and file slices

| Slice | Owner | Paths |
| --- | --- | --- |
| LLM extract | Claude | `backend/llm/` |
| Letters service | Claude | `backend/letters/`, `backend/care_paths/seed/ui/letter.yaml` |
| Resident screen | Claude | `frontend/src/features/letter/`, `frontend/src/shared/ui/actions/PhotoButton.tsx`, `frontend/src/app/residentRoutes.tsx`, `frontend/src/features/journey/JourneyStartPage.tsx` |

## Acceptance matrix

| # | Requirement | Implementation | Automated check | Observed evidence | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | The letter entry addresses "I got a letter", not one guide | `LetterEntryCard` → `/r/:lang/letter` | `letter.test.tsx` | Local app, phone viewport, so + ar: start card opens the photo screen (`docs/proof/2026-11-14/letter-photo-so.png`) | done |
| 2 | Camera / photo capture | `PhotoButton` (`capture="environment"`), client downscale | `letter.test.tsx` | File input driven by Playwright with a JPEG; the camera itself not tried on a real phone | partly |
| 3 | Analysis of the photo | `letters.explain` → `llm.extract` | `letters.test.ts`, `extract.test.ts` | 2 live calls (OpenRouter, Gemini 3.1 Flash-Lite), HTTP 200, kind `screening_cervical` | done |
| 4 | Information based on the analysis, in the resident's language | result screen: type, summary, facts, actions, next steps | `letter.test.tsx` | `docs/proof/2026-11-14/letter-result-so.png`, `letter-result-ar.png`; date, time and place match the example letter | done |
| 5 | Photo never stored or logged | no table, no blob; logs carry sizes and kind only | `letters.test.ts` (usage row context) | Recipient name absent from both live answers | done |

## Verification

- Targeted tests: `encore test llm letters`, `npx vitest run src/features/letter`
- `bash dev_readiness_check.sh --all` (contract changed)
- Demo path checked in the running app (Claude, 14 Nov 2026, headless Chromium 375×812 against local frontend :5300 and backend :8300): `/r/so` and `/r/ar` → "I got a letter" → JPEG of the Finnish example invitation → explanation. Screenshots `docs/proof/2026-11-14/letter-photo-{so,ar}.png`, `letter-result-{so,ar}.png`.

## Open questions

- Real phone camera (iOS Safari, Android Chrome) not tried yet.
- Only one letter type tried live. Result letters and non-health letters need a look before a demo relies on them.
- Somali and the other machine-translated `ui.letter.*` texts are unchecked.
