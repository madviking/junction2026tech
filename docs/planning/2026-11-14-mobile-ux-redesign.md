Status: active
Last reviewed: 2026-11-14

# Mobile UX redesign of the resident app

## Goal

On a phone, every resident screen shows one red control, the next action without scrolling,
and where the person is on their care path. Audit and evidence:
`docs/ux-audit/2026-11-14-mobile/audit.md`.

## Scope

- In: resident shell (header, bottom action bar), journey stages, symptom picker, free-text
  row, care path overview from the composed care path (hoitopolku), an about / trust page,
  start and language screens.
- Out: clinician, county and admin screens; journey rules; new overlays (the outcome
  question is an in-page step, not a sheet).

## Owners and file slices

| Slice | Owner | Paths |
| --- | --- | --- |
| 1 Contract and texts | Claude | `backend/care_paths/domain/compose.ts`, `backend/care_paths/seed/ui/journey.yaml`, `backend/care_paths/seed/ui/about.yaml`, `frontend/src/shared/api/client.ts` (generated) |
| 2 Shell primitives | Claude | `frontend/src/shared/ui/layout/PageShell.tsx`, `shells.module.css`, `actions/*`, `README.md` |
| 3 Journey screens | Claude | `frontend/src/features/journey/**` |
| 4 About page | Claude | `frontend/src/features/about/**`, `frontend/src/app/residentRoutes.tsx` |
| 5 Language, visit card, screening headers | Claude | `frontend/src/features/language/**`, callers of `EmergencyCallLink` |
| 6 Proof | Claude | `frontend/e2e/resident/*.spec.ts`, `docs/ux-audit/2026-11-14-mobile/` |

## Acceptance matrix

| # | Requirement | Implementation | Automated check | Observed evidence | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | One red button; 112 dials directly | Compact `EmergencyCallLink` in the header row; emergency signs behind the neutral "Urgent?" button | e2e journey (a), (c), (c2); vitest JourneyPage | `after/04-describe-fold.png`: header 59 px (was 173), one `tel:112` | done |
| 2 | The button that moves on is never below the fold | `PageActions` bottom bar: Start, Continue, "I contacted them", visit card | e2e journey (a) `toBeInViewport` | Continue and "I contacted them" at 644 px of 700 (were 2,441 and 2,622) | done |
| 3 | Less scattered: contact, symptoms, route, free text, footer | Collapsed limits and "they may ask", outcome step, duration step, one-row free text, code in header | vitest journey | Contact page 2,075 px (was 3,507); describe and wait fit one screen | done; the body map keeps its size |
| 4 | Steps visualised from care path data, easy to reach | `PathStep.stage`; `PathProgress` on every stage opens `PathOverview` | backend `domain.test.ts`, vitest JourneyPage, e2e journey (a) | `after/11-path-at-contact-full.png` | done |
| 5 | General information and trust screen | `/r/:lang/about`, linked from start and the path overview | vitest about | `after/03-about-full.png` | done; 13 languages, 11 of them unchecked translations |
| 6 | Move back in the path, and restart from the very beginning | `undo` event + `POST /api/visits/:code/back`, `VisitView.canGoBack`; back arrow in the header strip; "Go back one step" and "Start from the beginning" in the path overview | backend `visits.test.ts`, vitest JourneyPage, e2e journey (h) | `docs/proof/2026-11-14/journey-path-start.png` | done |

## Verification

- Targeted tests: `npx vitest run src/features/journey src/features/about src/shared/ui`
- `bash dev_readiness_check.sh --all` (contract and shared UI change)
- Demo path in the running app: Playwright re-capture into `docs/ux-audit/2026-11-14-mobile/after/`

## Open questions

- The five short journey strings have unchecked translations in all 13 languages. The about page is written in en + fi; its other 11 languages are unchecked machine translations (2026-11-14) and need a native reviewer before real use.
- e2e journey (f) expects an "unchecked translation" marker on the Arabic start screen that no component renders; it failed before this work.
- The about page has no listen buttons: its texts have no published audio.
