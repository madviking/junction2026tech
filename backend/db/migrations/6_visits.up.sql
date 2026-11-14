-- Anonymous visits and their event log. Owner: visits.
-- No names, IDs, phone numbers or e-mail addresses. The visit code itself is never
-- stored: only its sha256 (code_hash). Rows expire after 90 days.
CREATE TABLE visits (
    id BIGSERIAL PRIMARY KEY,
    code_hash TEXT NOT NULL UNIQUE,
    lang TEXT NOT NULL,
    county TEXT NOT NULL DEFAULT 'helsinki',
    -- Last known journey stage (cache for anonymous county counts; the journey state
    -- itself is always a replay of visit_events).
    stage TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days')
);

CREATE INDEX visits_county_idx ON visits (county);

-- One row per tap. payload holds codes only (symptom card ids, lane, route, visit
-- date), never free text.
CREATE TABLE visit_events (
    id BIGSERIAL PRIMARY KEY,
    visit_id BIGINT NOT NULL REFERENCES visits (id) ON DELETE CASCADE,
    at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor TEXT NOT NULL CHECK (actor IN ('resident', 'clinician')),
    kind TEXT NOT NULL CHECK (kind IN ('outcome', 'symptoms', 'clinician_answer')),
    stage TEXT NOT NULL,
    outcome TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX visit_events_visit_idx ON visit_events (visit_id, id);
