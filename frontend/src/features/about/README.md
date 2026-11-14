# about

`/r/:lang/about` — the general information and trust page (`AboutPage`): what Silta does,
what it does not do, privacy, what happens to typed or spoken words, where the facts come
from, and who made it. Linked from the journey start screen and from the care path
overview ("Your path") of a visit.

Texts: `ui.about.<section>.title|text` in `backend/care_paths/seed/ui/about.yaml` (en + fi are
the source; the other eleven languages are unchecked machine translations and need a
native reviewer). A new section is one entry in `SECTIONS` plus its
two keys. The page has no listen buttons yet: its texts have no published audio.

Every sentence is a claim a resident relies on, so it must match the code:

| Claim | Where it is true |
| --- | --- |
| No name, identity number or address | `backend/visits` stores only the code, language and tapped cards |
| Delete at any time | `DeleteVisitAction` on the visit card |
| The AI service never chooses or decides | `MatchInput` reads back and needs Yes; lane and door come from content (`backend/care_paths/README.md`) |
| The voice recording is not saved | `RecordAnswerButton`: memory only |
| "By law" and "Recommended" | `clocks[].basis` in the care path |

Test: `npx vitest run src/features/about`.
