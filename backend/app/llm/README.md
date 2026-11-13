# llm

The only module that talks to LLM providers. Rules and the add-a-feature
checklist: `.codex/skills/llm-integration/SKILL.md`.

## Use it

```python
from pydantic import BaseModel
from app.llm import LLMClient
from app.prompts import render_prompt

class IdeaSummary(BaseModel):          # lives in your module's schemas.py
    headline: str
    points: list[str]

result = LLMClient().complete(
    feature="ideas.summarize",          # = integrations/ideas.summarize.yaml
    messages=[
        {"role": "system", "content": render_prompt("ideas_summarize_system", max_points=3)},
        {"role": "user", "content": text},
    ],
    output_type=IdeaSummary,            # JSON-schema response, validated
    context={"idea_id": idea_id},       # stored on the usage row
)
result.parsed  # IdeaSummary
```

Errors: `LLMConfigError` (missing seed or key; not retried), `LLMProviderError`
(HTTP/timeout/malformed; tries the fallback model), `LLMOutputError` (answer did
not match `output_type`).

## Files

- `integrations/<key>.yaml`: provider, model, fallback, temperature, max tokens,
  description, prompt names. Override a model without editing:
  `LLM_MODEL__<KEY_UPPER>` (non-alphanumerics become `_`).
- `providers.py`: `openrouter` (default), `openai`, `mistral` (East's local vLLM
  through an SSH tunnel; set `MISTRAL_BASE_URL`, `MISTRAL_API_KEY`). All are
  OpenAI-compatible.
- `client.py`: `LLMClient.complete()`; transport and usage sink are injectable
  for tests.
- `repository.py`: `llm_usage` SQL. Table owned by this module
  (`db/migrations/1_llm_usage.up.sql`).
- `cli.py`: `smoke` (one tiny paid call), `usage` (spend per feature/model),
  `integrations` (resolved models).

## Usage and cost

Every attempt writes one `llm_usage` row: feature, provider, model, status
(`ok`, `provider_error`, `invalid_output`), tokens, latency, error and context.
OpenRouter reports the billed `cost_usd`; other providers leave it null, so
estimate from tokens. Check spend with:

```bash
cd backend && uv run python -m app.llm.cli usage
```

## Tests

`backend/tests/llm/` uses a fake transport and an in-memory sink: no network,
no paid calls. Prove a real feature once with a tiny input and report its usage row.

## Not here yet (add when a feature needs it)

Embeddings, streaming, tool calling, PydanticAI agents, prompt caching. Add them
to this module, not to features.
