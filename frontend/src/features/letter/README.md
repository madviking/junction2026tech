# letter

"I got a letter" (2026-11-14): the resident takes a photo of a letter and sees, in their own
language, what it is, the facts printed in it and what to do. Replaces the old start-screen
entry that opened the cervical screening guide whatever the letter was.
Backend: `backend/letters/README.md`. Plan: `docs/planning/2026-11-14-letter-photo.md`.

## Route (wired in `src/app/residentRoutes.tsx`)

| Path | Page | Shows |
| --- | --- | --- |
| `/r/:lang/letter` | `LetterPage` | Photo tips + privacy line + "Take a photo" / "Choose a photo" → reading → result (title, summary, facts as printed, steps, machine-made notice, guide button for cervical screening). Unreadable photo → warning and the photo buttons again. Service failure → error with retry (same photo). |

`LetterEntryCard` (public) is the "I got a letter" card on the journey start screen. The
page also offers `ScreeningEntryCard` for residents who do not have the letter with them.

## How it works

- `PhotoButton` (`@/shared/ui`) is a file input: `camera` opens the back camera on phones,
  without it the photo library. No camera permission prompt of ours, works on desktop too.
- `lib/preparePhoto.ts`: a sendable photo under 900 kB goes as it is; anything else is drawn
  to a canvas (rotation applied), longest edge 1800 → 1400 → 1100 px, JPEG, until under 1.3 MB.
- `api/useExplainLetter.ts`: mutation, `gcTime: 0`. The photo and the result live in the
  page's memory only; nothing goes to browser storage, and leaving the page drops them.
- Facts (`when`, `where`, …) are shown as printed inside `DirectionScope dir="ltr" lang="fi"`,
  so they can be compared with the paper letter also on Arabic and Persian pages.
- The generated summary has no "Listen" button: audio exists per published text key only.

## Tests

`letter.test.tsx`: start card → photo screen (privacy text, `capture="environment"`) →
photo sent → explanation, facts, call link, guide; unreadable; error and retry.
