# llm

The only service that calls an LLM provider. Rules:
`.codex/skills/llm-integration/SKILL.md`. Provider API facts:
`docs/planning/2026-11-14-provider-api-notes.md`.

## Endpoints (all internal, `expose: false`; call through `~encore/clients`)

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/llm/complete` | `CompleteRequest { feature, messages: { role: 'user'\|'model', text }[], system?, context? }` | `CompleteResponse { text, model, provider, fake, totalTokens?, latencyMs }` |
| POST | `/llm/decide` | `DecideRequest { feature, input, instructions, options: { id, description }[], context? }` | `DecideResponse { choice, probabilities: { id, p }[] (highest first), confidence, model, provider, fake, latencyMs }` |
| POST | `/llm/extract` | `ExtractRequest { feature, system?, text, image?: { mime, base64 }, schemaName, schemaJson, context? }` | `ExtractResponse { json, model, provider, fake, totalTokens?, latencyMs }` |
| GET | `/internal/llm/usage-summary` | — | `UsageSummary { rows: { day, provider, feature, calls, tokens, costUsd }[] }` (last 30 days, newest day first) |
| GET | `/internal/llm/spend` | — | `Spend { usd }` (all-time sum of `llm_usage.cost_usd`) |

`decide` is a closed-set classifier (Gemini Decision 1 through the Decisions API):
2–255 options, ids `[A-Za-z0-9_-]{1,64}`, unique; `input` and `instructions`
non-empty. A refusal or a choice outside the options is an `invalid_output` failure.
`extract` is structured output: one user turn (text plus at most one image) answered as a
JSON object that follows `schemaJson` (OpenRouter `response_format: json_schema` strict,
Gemini `responseJsonSchema`). The adapter checks the answer is a JSON object
(`invalid_output` otherwise); the caller validates the fields. The image is passed through
and never stored or logged. Used by `letters.explain`.
`context` goes to the usage row: ids only, never personal data.

## Files

- `integrations.ts`: per feature key `provider` (`openrouter` | `gemini`), `kind`
  (`complete` | `decide` | `extract`), model family, temperature, token limit, and the price per
  1M tokens. Model IDs live only here. Switching a feature to Gemini direct is one
  line: change its `provider`. Tonight every product feature uses OpenRouter; the
  `smoke.*` entries exist for the live smoke only.
- `providers.config.ts`: `mode: 'live' | 'fake'` (set `fake` at the spend cut-off)
  and `spendCapUsd` (3.00): in live mode, before a paid call, if recorded spend is at
  or above the cap the call is refused with `unavailable` (a `provider_error` row with
  cost 0 and error `spend_cap_reached`; a warning is logged). It never falls back to
  the fake: a fake decision would be read back to a resident as if it were real.
- `openrouter.ts`: chat completions (`/api/v1/chat/completions`) and the alpha
  Decisions endpoint (`/api/alpha/decisions`, content in `state`). Secret
  `OpenRouterApiKey`. Cost comes from `usage.cost`.
- `gemini.ts`: `models/{model}:generateContent` and `/v1beta/decisions` (content in
  `input`). Secret `GeminiApiKey`. Gemini returns no cost; `service.ts` computes it
  from the price in `integrations.ts`. Safety blocks (HTTP 400, `error.code` safety
  etc.) count as `invalid_output`.
- `fake.ts`: used only in `mode: 'fake'`; deterministic, no network, cost 0. `decide` scores options by shared
  words with the input. Marked `provider: 'fake'` on the usage row, `fake: true` in
  responses.
- `provider.ts`: adapter contract and error classes (`ProviderError` →
  `provider_error`, `InvalidOutputError` → `invalid_output`).
- `service.ts`: feature lookup, provider selection, one attempt per call (no retries).
- `usage.ts` + `repository.ts`: the `llm_usage` table (this service owns it).

## Table `llm_usage`

One row per attempt, also on failure: feature, provider (`openrouter` | `gemini` |
`fake`), model, status (`ok` | `provider_error` | `invalid_output`), tokens,
`cost_usd` (NUMERIC(16, 10), migration 8), latency, error, context.

## Add a feature

1. Add its key (`<service>.<purpose>`) to `integrations.ts` with `provider`, `kind`
   and family; describe input, output and what a bad answer costs.
2. Call `llm.complete` or `llm.decide` with that key; keep the prompt in
   `<service>/prompts/`.
3. Test with `fetch` stubbed (`llm.test.ts`, `decide.test.ts`). No paid calls in tests.

## Test

```bash
encore test llm/                                   # stubbed, no network
LLM_LIVE_SMOKE=1 encore test llm/live.smoke.test.ts # 4 tiny paid calls (< $0.001)
```

Live smoke 2026-11-14 (test database rows): OpenRouter complete 8 tokens $0.00000325;
Gemini direct complete 9 tokens $0.0000035; OpenRouter decide 119 tokens $0.0000119;
Gemini direct decide 119 tokens $0.0000119.

Secrets: `encore secret set --type local,dev OpenRouterApiKey` and `GeminiApiKey`
(self-hosted: mapped in `infra.config.json`).
