# llm

The only service that calls an LLM provider (Gemini). Rules:
`.codex/skills/llm-integration/SKILL.md`.

- `llm.complete` (internal, `POST /llm/complete`): `{ feature, messages, system?, context? }`
  → `{ text, model, totalTokens, latencyMs }`. Other services call it through
  `~encore/clients`.
- `integrations.ts`: model, temperature and token limit per feature key.
- `gemini.ts`: the provider call; reads the `GeminiApiKey` secret.
- `repository.ts`: owns `llm_usage`; one row per attempt, also on failure.

Add a feature: add its key to `integrations.ts`, call `llm.complete` with that
key, and test with `fetch` stubbed (`llm.test.ts`). No paid calls in tests.

Secret: `encore secret set --type local,dev GeminiApiKey` (self-hosted:
`GEMINI_API_KEY`).

Not ported from the Python scaffold yet: fallback models, JSON-schema output and
cost in `llm_usage.cost_usd` (Gemini does not return a billed cost).
