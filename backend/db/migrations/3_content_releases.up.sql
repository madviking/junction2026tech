-- Versioned content document (structure + cards + texts). Owner: content.
-- doc is TEXT holding JSON on purpose: jsonb reorders object keys, and the order of
-- stages, outcomes and cards is the order on screen.
CREATE TABLE content_releases (
    id BIGSERIAL PRIMARY KEY,
    -- 1, 2, 3 ... for published releases; NULL for the draft.
    version INTEGER,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
    doc TEXT NOT NULL,
    -- Hash of the seed files a seed-made release came from (NULL for admin releases).
    seed_fingerprint TEXT,
    -- Published release a draft started from.
    based_on BIGINT REFERENCES content_releases (id),
    note TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    CHECK ((status = 'published') = (version IS NOT NULL))
);

CREATE UNIQUE INDEX content_releases_version_idx ON content_releases (version) WHERE version IS NOT NULL;
-- At most one draft at a time.
CREATE UNIQUE INDEX content_releases_one_draft_idx ON content_releases (status) WHERE status = 'draft';

-- The live (published) release residents see. Exactly one row once seeded.
CREATE TABLE content_live (
    id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
    release_id BIGINT NOT NULL REFERENCES content_releases (id),
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
