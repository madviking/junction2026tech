# cards

Matches what a resident typed or said (free text or a voice transcript) to one card
of a closed set from the published content, through `llm.decide` (feature
`cards.match`). Owns no tables.

## Endpoint

`POST /api/cards/match` (public)

- Request `MatchRequest { lang, text, set: 'symptoms' | 'route' | 'outcomes', stage? }`
  (`stage` is a journey stage id, required for `outcomes`).
- Response `MatchResponse { status: 'confirm' | 'choose', top: MatchOption | null, ranked: MatchOption[] }`,
  `MatchOption { id, text, probability }`; `text` is the card in the person's language
  (English fallback), `ranked` is highest probability first.
- `confirm`: the UI reads `top` back for the person to confirm. `choose`: the UI shows
  the cards instead of guessing (`top: null`).
- Invalid argument: unknown `lang`, `set` or `stage`, a stage without outcome cards,
  text over 2000 characters.

## Rules

- Options come only from `content.liveDoc()`: symptom cards (`card.symptom.<id>.card`
  + `.detail`), route cards (`route.<code>.card`) or the outcomes of the given stage
  (`journey.outcome.<stage>.<id>.card`). Each option's description gives the English
  text and the person's-language text.
- Interrupts are never options: the classifier never triggers or suppresses the
  emergency screen and never chooses a lane.
- `redact.ts` strips identifiers before anything leaves the backend: visit codes
  (`SLT-XXXX-XXXX`, any case), henkilötunnus, e-mail addresses, phone numbers, digit
  runs of 5+, self-introduced names (en "my name is / I am called / this is", fi
  "nimeni on / olen" + capitalised words; so "magacaygu waa", ar "اسمي" + the next
  one to three words) and street addresses ("…katu/tie/kuja 12", "12 Baker Street").
  Heuristic: symptom wording such as "I am worried about a lump" is kept. The input
  text is never logged or stored. Only identifiers left → `choose`
  without a provider call.
- Guard rails in `config.ts`: `minConfidence` 0.55 and `minMargin` 0.15 between the
  top two probabilities; below either → `choose`.
- A stage with a single outcome → `choose` without a provider call.
- When `llm` refuses (spend cap) or the provider fails, the endpoint fails
  (`unavailable`); the UI then shows the cards. It never guesses.

## Files

`cards.ts` endpoint · `service.ts` rules · `options.ts` options from the content ·
`redact.ts` · `config.ts` · `prompts/match.ts` classifier instructions ·
`eval/labelled.yaml` + `eval/eval.live.test.ts` live eval.

## Test

```bash
encore test cards/                                        # fetch stubbed, no network
CARDS_EVAL_LIVE=1 encore test cards/eval/eval.live.test.ts # 40 paid calls, ~$0.002
```

The eval writes `docs/proof/2026-11-14/classifier-eval.md` (2026-11-14: 36/36
correct confirms, 4/4 vague inputs → choose, $0.0015).
