Status: active
Last reviewed: 2026-11-14

# Mobile UX audit: resident app

Scope: the resident journey at phone size (`/`, `/r/:lang`, `/r/:lang/v/:code`, visit card,
cervical guide and letter). Captured from the local app (frontend `:5300`, backend `:8300`)
with Playwright at 375 × 700 px, the area a phone browser shows before scrolling.

Evidence: `screens/NN-name-fold.png` (first view) and `screens/NN-name-full.png` (whole page),
24 states; `screens/metrics.json` holds page height and the position of every control.
Proposed design: https://claude.ai/artifact/VVT66B6BT2M8uTtZSaAj2X (private to its owner until shared).

After the redesign (2026-11-14): `after/NN-name-fold.png` and `-full.png`, same viewport; plan and
acceptance matrix in `docs/planning/2026-11-14-mobile-ux-redesign.md`.

Not captured: the free-text / voice read-back (it makes paid match calls), the picture
symptom picker with a body part chosen, the "how long" step as its own state, loading and
send-error states. Screen-reader and keyboard behaviour was not tested.

## Worth keeping

- One question per screen, plain wording, a listen button on every choice.
- Emergency reachable from every stage, and the emergency screen works offline.
- Tapping a card moves on at once; only multi-select needs a Continue.

## Top problems, by impact

| # | Severity | Screen | Problem | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Critical | Contact (`08`, `16`) | The page is 3,507 px, five screens. The answer cards that move the journey on start at 2,622 px; nothing on the first view says they exist. | `08-contact-door-full.png` |
| 2 | High | Every journey screen | The fixed header is 173 px, a quarter of the screen, and holds two full-width red buttons ("Emergency? Call 112", "This is an emergency") that read as the same action. | `03-describe-fold.png` |
| 3 | High | Symptoms (`04`–`06`) | Continue sits at 2,061 px (2,441 px with a card chosen). The "how long" question appears below the fold after a card is chosen, so the page grows under the person. | `05-symptoms-selected-full.png` |
| 4 | High | Route (`07`) | Helper questions, the text field and the microphone come before the choices; the first choice card starts around 815 px, below the fold. | `07-route-fold.png` |
| 5 | Medium | Contact | 34 listen buttons on one page, two per script line (Finnish and translation), with no way to play the script in one go. | `metrics.json` |
| 6 | Medium | All stages | The free-text block (label, field, Check, large microphone) takes about 330 px on every screen and outweighs the cards visually. | `10-wait-full.png` |
| 7 | Medium | All stages | The footer (divider, hint, "Something changed", code, save hint) adds about 250 px to every screen. | `10-wait-full.png` |
| 8 | Medium | Visit (`11`) | "Show your visit card" is a filled button above the question, so two tasks compete; the answer cards run to 1,297 px. | `11-visit-full.png` |
| 9 | Medium | Whole journey | No sense of place: no step indicator and, past the start screen, no back. | all |
| 10 | Low | Language (`01`) | One column of 13 languages needs 1.7 screens; six are below the fold. | `01-language-picker-fold.png` |
| 11 | Low | Visit date (`09`) | The filled button is the skip ("Continue without a date"). | `09-contact-visit-date-fold.png` |
| 12 | Low | Stalled (`17`) | Each ladder rung carries its own listen button on a separate row, pushing the answers to 701 px. | `17-stalled-full.png` |

## What to remove or consolidate

- Two red buttons → one red "112" pill in a 56 px header that dials directly (decided 2026-11-14: keep direct dial). The emergency signs screen is reached from a neutral outlined "Urgent?" button beside it; that screen keeps one large red "Call 112".
- Label + field + Check + big microphone → one text field with a microphone beside it.
- Hint + "Something changed" + code + save hint → the code under the title in the header; "Something changed" as a text link at the end of the content.
- Two listen buttons per script line → one per line, plus "Play all".
- Time limits and fee note → one collapsed row on the contact screen.

## Target pattern

1. Header 56 px: name, visit code, neutral "Urgent?" button, one red "112" pill (direct dial). A five-step progress bar under it.
2. Content: question with one listen button, then the choices. Helper text collapsed.
3. Bottom bar, always visible: the one action that moves on (Start, Continue, "I contacted them", "Show my visit card"), with the microphone beside it where free text applies.

## Accessibility risks to check during the build

- Touch targets stay at least 44 px after the listen buttons shrink.
- The bottom bar must not cover focused fields when the keyboard opens, and must reflow at 200% zoom.
- The outcome sheet needs focus trapping and a close control; the progress bar needs a text label.
- Arabic (`22`, `23`): header, chevrons and the progress bar must mirror.

## Suggested order

1. Shell: slim header, one emergency control, bottom action bar, progress (`PageShell`, `JourneyFrame`, `JourneyScreen`).
2. Contact stage: collapsed script and limits, "I contacted them" → outcome sheet (`ContactStage`, `CallScript`).
3. Symptom picker: chips, compact tiles, Continue in the bar, "how long" as its own step (`SymptomPicker`, `SymptomBodyPicker`).
4. Compact free-text row and footer (`MatchInput`, `JourneyScreen`); route helper collapsed (`RouteStage`).
5. Start, visit, language grid.
