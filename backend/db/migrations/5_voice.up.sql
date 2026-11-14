-- Audio clips, their review state, and voice provider usage. Owner: voice.

-- Audio bytes (Aiven has no object storage). Generated audio is keyed by the exact
-- text, language, voice and model, so the same text is never generated twice.
CREATE TABLE audio_blobs (
    id BIGSERIAL PRIMARY KEY,
    -- sha256 (hex) of the exact text the audio speaks.
    text_hash TEXT NOT NULL,
    lang TEXT NOT NULL,
    -- Provider voice and model; 'human' for human recordings.
    voice_id TEXT NOT NULL,
    model TEXT NOT NULL,
    mime TEXT NOT NULL,
    bytes BYTEA NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('generated', 'human')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX audio_blobs_generated_uniq
    ON audio_blobs (text_hash, lang, voice_id, model) WHERE source = 'generated';

-- One clip for one text key in one language, pointing at a blob. A text change gives a
-- new hash, so assets for the old hash become stale and are never served.
CREATE TABLE audio_assets (
    id BIGSERIAL PRIMARY KEY,
    text_key TEXT NOT NULL,
    lang TEXT NOT NULL,
    text_hash TEXT NOT NULL,
    blob_id BIGINT NOT NULL REFERENCES audio_blobs (id),
    source TEXT NOT NULL CHECK (source IN ('generated', 'human')),
    review TEXT NOT NULL CHECK (review IN ('unchecked', 'approved')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_by TEXT,
    approved_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX audio_assets_generated_uniq
    ON audio_assets (text_key, lang, blob_id) WHERE source = 'generated';
CREATE INDEX audio_assets_key_idx ON audio_assets (text_key, lang, text_hash);

-- One row per provider call. Never the text, the audio or a transcript.
CREATE TABLE voice_usage (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    provider TEXT NOT NULL,
    feature TEXT NOT NULL,
    model TEXT NOT NULL,
    characters INT NOT NULL DEFAULT 0,
    seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    status TEXT NOT NULL
);

CREATE INDEX voice_usage_created_idx ON voice_usage (created_at);
