---
name: llm-integration
description: Use when adding or changing anything that calls an LLM (completions, structured extraction, classification, generation, embeddings) or when choosing models, prompts, providers or LLM cost. Enforces the shared backend/app/llm boundary, file-based model registry and prompts, typed output and usage recording.
---

# LLM Integration

Read `backend/app/llm/README.md` first. This follows Queast's LLM rules, reduced
to what a hackathon needs.

## Non-negotiables

- **One boundary.** Only `backend/app/llm/` talks to providers. Feature code never
  imports provider SDKs, builds provider URLs or reads provider API keys.
- **No model literals in feature code.** Each feature has
  `backend/app/llm/integrations/<feature_key>.yaml` (provider, model, fallback,
  temperature, max tokens, description). Call sites pass the feature key. Env
  override: `LLM_MODEL__<FEATURE_KEY_UPPER>`.
- **Prompts are files.** `backend/app/prompts/<name>.txt`, rendered with
  `render_prompt(name, **values)` (`{key}` placeholders; missing keys raise). No
  prompt text or rule blocks inline in Python.
- **Typed output.** Pass a Pydantic model as `output_type`; the client requests a
  JSON schema response and validates it. Never regex or substring-parse model
  text as a feature contract.
- **Usage on every attempt.** The client writes one `llm_usage` row per attempt,
  including failures, with feature key, provider, model, tokens, cost (when the
  provider reports it), latency and status. Never wrap recording in
  `except: pass`.
- **Cost approval.** Estimate cases × tokens × price before batches, evals or
  model comparisons. ≤ 2 €: go, then report actual spend from `llm_usage`. > 2 €:
  ask first with the estimate.

## Providers

| Provider key | Use | Notes |
| --- | --- | --- |
| `openrouter` | Default for everything | `OPEN_ROUTER_API_KEY`; model IDs like `openai/gpt-4.1-mini` |
| `openai` | Only when a feature needs a direct OpenAI capability | `OPENAI_API_KEY`; direct IDs like `gpt-4.1-mini` |
| `mistral` | East's local vLLM host (free, slower, lower quality) | Needs the SSH tunnel and `MISTRAL_API_KEY`; not available at the venue without it; never the only path in a demo |

All three speak the OpenAI chat-completions protocol, so a new compatible
provider is one entry in `backend/app/llm/providers.py`.

## Adding an LLM feature

1. Pick a stable feature key (`<module>.<purpose>`, e.g. `ideas.summarize`).
2. Add `backend/app/llm/integrations/<key>.yaml` (copy `example.summary.yaml`);
   describe input, output contract and what a bad answer costs.
3. Add the prompt file(s) under `backend/app/prompts/`.
4. Define the Pydantic output model in the feature's `schemas.py`.
5. Call `LLMClient.complete(feature="<key>", messages=[...], output_type=...)`
   from the feature service.
6. Tests: unit-test prompt rendering and output handling with a fake transport
   (`tests/llm/test_client.py` shows how). Do not hit paid APIs in the test suite.
7. Prove it once against the real provider with a tiny input; report the
   `llm_usage` row (tokens, cost).

## Anti-patterns (reject in review)

- `httpx.post("https://openrouter.ai/...")` or `import openai` in a feature module.
- `model="gpt-..."` defaults in function signatures, CLI args or env reads.
- `json.loads(response_text)` on free-form output, regex extraction.
- Retrying paid calls in a loop until a test passes.
- Frontend calling an LLM provider directly or holding a provider key.
