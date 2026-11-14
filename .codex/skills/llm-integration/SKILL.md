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

## Providers

OpenRouter (default) and Gemini direct, each an adapter in `backend/llm/`
(`openrouter.ts`, `gemini.ts`) plus `fake.ts`. Each integration in `integrations.ts`
names its `provider` and `kind` (`complete` or `decide`); switching a feature to Gemini
direct is a one-line change. Closed-set choices (free text → one of our cards) use
`llm.decide` with Gemini Decision 1 (probabilities, no generated text); options always
come from published content, never from the model. `providers.config.ts` can force the
fake adapter and caps automatic spend. Provider API facts:
`docs/planning/2026-11-14-provider-api-notes.md`.

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
