# screening

The "I got a screening letter" way into Silta (2026-11-14). Starts with cervical cancer
screening: an example invitation letter carrying the Silta QR code, and the visual guide the
code opens, in every published language.

## Routes (wired in `src/app/residentRoutes.tsx`)

| Path | Page | Shows |
| --- | --- | --- |
| `/letter/cervical/:lang` | `CervicalLetterPage` | Example invitation as a Helsinki resident gets it, in the chosen language (language picker, print, "open the guide"). Stamped "example"; person, address, reservation key and PIN are fictional. |
| `/r/:lang/learn/cervical` | `CervicalLearnPage` | Overview (timeline letter → visit → result → next in 5 years, list of parts) → five parts → done. `?part=why|visit|rights|after|faq|done` keeps the position, so the phone's back button works. |

`ScreeningEntryCard` (public) is the "I got a letter about cervical screening" card on the
journey start screen (`features/journey/JourneyStartPage`).

## Content

- Every text is published content, `ui.screening.*`: en + fi in
  `backend/care_paths/seed/ui/screening.yaml`, the other eleven languages appended to
  `backend/care_paths/seed/texts.<lang>.yaml` (machine-translated 14 Nov 2026, unchecked;
  Somali needs a native-speaker check before real use).
- Course structure (parts, cards, pictures, checklist and FAQ keys) is `cervicalCourse.ts`.
  Add a card: add its keys to the seed and one line there.
- Finnish desk phrases (`ui.screening.learn.phrase.*_fi`) hold the same Finnish sentence in
  every language; only `*_meaning` is translated.
- QR codes: `frontend/public/qr/letter-cervical-<lang>.svg`, pointing to
  `https://fond-useful-corgi.eur-1.aiven.app/r/<lang>/learn/cervical?via=letter-cervical-hel`.
  Regenerate with segno from `../presentation/.venv` if the app URL changes.

## Facts and sources

Letter and guide follow the real Helsinki process (checked 14 Nov 2026):
- City of Helsinki, cervical cancer screening: women 25–65 every five years, free and
  voluntary, time and place in the letter, HPV test from 30, Pap test under 30, results in
  ~2 months by post / OmaPosti, not in OmaKanta or Maisa.
  https://www.hel.fi/en/health-and-social-services/health-care/other-health-care-services/cervical-cancer-screening
- HUS, cervical cancer screening: pre-booked time, reservation key + PIN to change online,
  bring Kela card / ID and the paper health form, not during a period, no vaginal
  suppositories or gels 1–2 days before, pregnancy up to week 35, after hysterectomy the
  sample is from the vagina, visit ~10 min, colposcopy after abnormal results, control sample
  within two years for slight changes.
  https://www.hus.fi/en/patient/treatments-and-examinations/cervical-cancer-screening
- HUS medical history form for cervical screening (the "enclosed health form"):
  https://www.hus.fi/sites/default/files/2021-03/cervical-cancer-screening-form-2021.pdf

Rights wording is deliberately soft where the sources do not promise more: a female sample
taker is something to *ask for* (most sample takers are women), an interpreter is requested
when calling customer service.

## Design system

Visuals come from `@/shared/ui`: `LessonScene`, `LessonProgress`, `Checklist`,
`TimelineStrip`, `FaqItem`, `PhraseCard`, `PrintHidden` (`shared/ui/learn/`) and
`LetterSheet`, `LetterFacts`, `LetterSection`, `LetterBullets`, `LetterQrBlock`
(`shared/ui/document/`). `PageShell` hides its header and bottom bar on print.

## Tests

`screening.test.tsx`: overview → every part → done → letter; FAQ opens; rights show the
Finnish phrases; the letter renders in the route language with that language's QR code.
