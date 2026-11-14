# letters

"I got a letter" (2026-11-14): a resident takes a photo of a letter they cannot read and gets
it explained in their language. One photo in, one explanation out; nothing is kept.
Plan and decisions: `docs/planning/2026-11-14-letter-photo.md`.

## Endpoint (public, anonymous)

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/api/letters/explain` | `ExplainRequest { lang, imageBase64, mime }` | `LetterExplanation { status: 'explained' \| 'unreadable', lang, kind, guide?, title, summary, actions[], sender?, when?, where?, deadline?, phone? }` |

- `lang`: one of the published languages (`care_paths/domain/types.ts` `LANGS`).
- Photo: JPEG, PNG or WebP, at most 1.4 MB of bytes (`MAX_IMAGE_BYTES`; the frontend scales
  the photo down first), first bytes checked against the declared type. Other input →
  `invalid_argument`; too large → `resource_exhausted`.
- `kind` is a closed set (`prompts/explain.ts` `LETTER_KINDS`); an unknown value becomes `other`.
- `guide`: `cervical` for `screening_cervical` (the frontend opens `/r/:lang/learn/cervical`).
- `title`, `summary`, `actions` (at most 5) are machine-written in `lang`. `sender`, `when`,
  `where`, `deadline`, `phone` are copied from the letter as printed; `phone` is dropped
  unless it looks like a phone number.
- `status: 'unreadable'`: the model could not read a letter in the photo; text fields are empty.
- Provider down or spend cap reached → `unavailable` (from `llm.extract`).

## Privacy rules

- No table, no blob, no file: the photo and the answer exist only during the request.
- Logs carry language, image size, status, kind and counts. Never the image or any text.
- The `llm_usage` row has `context: { lang }` only.
- The prompt forbids returning the recipient's name, address, date of birth or identity code;
  `service.ts` also removes anything shaped like a Finnish personal identity code from every
  returned string.
- The photo does leave our backend once, to the LLM provider (`letters.explain` in
  `llm/integrations.ts`). The screen says so before the camera opens (`ui.letter.privacy`).

## Files

| File | Role |
| --- | --- |
| `letters.ts` | Endpoint |
| `service.ts` | Validation, the `llm.extract` call, turning the model's JSON into the response field by field |
| `image.ts` | Base64 decode with limit, type check by first bytes |
| `prompts/explain.ts` | System prompt, JSON schema of the answer, letter kinds |

Texts of the screen: `care_paths/seed/ui/letter.yaml` (`ui.letter.*`, all 13 languages).

## Test

```bash
encore test letters     # provider stubbed over fetch, no paid calls
```
