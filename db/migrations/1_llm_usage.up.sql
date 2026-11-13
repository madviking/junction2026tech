-- One row per LLM attempt (success or failure). Written only by backend/app/llm.
CREATE TABLE llm_usage (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    feature TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ok', 'provider_error', 'invalid_output')),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost_usd NUMERIC(12, 6),
    latency_ms INTEGER NOT NULL,
    error TEXT,
    context JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX llm_usage_feature_created_idx ON llm_usage (feature, created_at DESC);
