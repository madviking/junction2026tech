# shared/i18n

The one i18n layer. Every resident-facing text comes from the **published** content
(`GET /api/content/live?lang=`), so the team edits wording in the admin without code and
residents only ever see what is published. Admin screens are English and do not use it.

- `<ContentProvider lang>`: loads the live bundle for a language (loading and error
  states included) and sets `<html dir lang>` (Arabic and Persian are right-to-left).
- `useT()` → `t(key, vars?)`: text in the current language; the backend already falls back
  to English; a missing key renders as the key itself so gaps are visible. `{name}`
  placeholders are filled from `vars`.
- `useContent()` → `{ lang, dir, placeholder, bundle, t, has, meta }`. `placeholder` is
  true for every language except English and Finnish (machine-translated, unchecked).
  Residents see no "unchecked" marks (team decision 14 Nov: visual noise); review status
  lives in the admin only.
  `bundle.journey` / `bundle.cards` hold the published structure.
- `useLiveContent(lang)`: the raw query (e.g. the language picker reads `languages`).

## Adding a string

Add `ui.<feature>.<name>` to `backend/care_paths/seed/ui/<feature>.yaml` with `en` and
`fi` (and `so` / `ar` placeholders), and, when you can, in each `backend/care_paths/seed/texts.<lang>.yaml` of the other
languages (sv, ru, et, uk, fa, zh, yue, vi, th, bg); until then those languages show English.
On the next backend start the seed merge adds missing
keys to the live content (see `backend/content/service.ts`). Content keys
(`journey.*`, `card.*`, `route.*`, ...) come from `backend/care_paths/domain/keys.ts`.
