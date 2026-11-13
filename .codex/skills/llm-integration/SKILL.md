---
name: llm-integration
description: Use when adding or changing anything that calls an LLM (completions, structured extraction, classification, generation, embeddings) or when choosing models, prompts, providers or LLM cost. Enforces the shared backend/llm boundary, the per-feature model registry and usage recording.
---

# LLM Integration

Read `backend/llm/README.md` first.

## Non-negotiables

- **One boundary.** Only the `llm` service (`backend/llm/`) talks to providers.
  Other services never import provider SDKs, build provider URLs or read
  provider secrets. The policy check enforces this.
- **No model literals outside `backend/llm/`.** Each feature has an entry in
  `backend/llm/integrations.ts` (model, temperature, token limit, description).
  Call sites pass the feature key.
- **Prompts are not inline rule blocks.** Keep each prompt in its own file in the
  calling service (`<service>/prompts/<name>.ts`), not scattered in logic.
- **No parsing of free text as a contract.** When a feature needs structured
  output, add JSON-schema output to `llm` first; never regex model text.
- **Usage on every attempt.** `llm.complete` writes one `llm_usage` row per
  attempt, including failures. Never swallow a recording error.
- **Cost approval.** Estimate cases × tokens × price before batches, evals or
  model comparisons. ≤ 2 €: go, then report actual token use from `llm_usage`.
  > 2 €: ask first with the estimate.

## Provider

Gemini only, through `backend/llm/gemini.ts` and the `GeminiApiKey` secret.
Another provider is a second file beside it plus a `provider` field on the
integration; do not add it before a feature needs it.

## Adding an LLM feature

1. Pick a stable feature key (`<service>.<purpose>`, e.g. `content.simplify`).
2. Add it to `backend/llm/integrations.ts`; describe input, output and what a
   bad answer costs.
3. Call `llm.complete({ feature, messages, system })` from the service through
   `~encore/clients`.
4. Tests: stub `fetch` (`backend/llm/llm.test.ts` shows how). No paid calls in
   the test suite.
5. Prove it once against the real provider with a tiny input; report the
   `llm_usage` row (tokens).

## Anti-patterns (reject in review)

- `fetch("https://generativelanguage.googleapis.com/...")` or a provider SDK
  import outside `backend/llm/`.
- A model ID in a function signature, an env read or a request field.
- `JSON.parse(responseText)` on free-form output, regex extraction.
- Retrying paid calls in a loop until a test passes.
- The frontend calling an LLM provider directly or holding a provider key.
