# language

`/` — the language picker (`LanguagePage`). Lists `bundle.languages` from the published
content (English bundle) by their native names as ChoiceCards in a two-column grid; placeholder languages
(Somali, Arabic tonight) carry the "Translation not yet checked" marker. Tapping opens
`/r/<code>` (the journey start in that language; `WithLanguage` loads its content and the
i18n layer sets `dir`).

UI strings: `ui.language.*` in `backend/care_paths/seed/ui/language.yaml`.
Test: `npx vitest run src/features/language`; browser: `e2e/resident/journey.spec.ts` (a).
