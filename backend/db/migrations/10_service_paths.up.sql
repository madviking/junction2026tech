-- Service paths by area (owner: service_paths). Plan: docs/planning/2026-11-14-service-paths.md.
-- Facts per area with a source and a status; only 'published' rows reach public screens.
-- Rows are loaded from backend/service_paths/seed on first use and edited in the admin.

-- The four new areas. counties stays owned by regions; this only adds rows.
INSERT INTO counties (id, name) VALUES
    ('lansi-uusimaa', 'Länsi-Uudenmaan hyvinvointialue / Western Uusimaa'),
    ('kymenlaakso', 'Kymenlaakson hyvinvointialue / Kymenlaakso'),
    ('etela-pohjanmaa', 'Etelä-Pohjanmaan hyvinvointialue / South Ostrobothnia'),
    ('pohjois-pohjanmaa', 'Pohjois-Pohjanmaan hyvinvointialue / North Ostrobothnia')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE sp_areas (
    county_id TEXT PRIMARY KEY REFERENCES counties (id) ON DELETE CASCADE,
    specialist_provider TEXT,
    collaboration_area TEXT,
    sotkanet_region_id INTEGER
);

CREATE TABLE sp_sources (
    id BIGSERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE CHECK (url LIKE 'https://%'),
    title TEXT NOT NULL,
    publisher TEXT NOT NULL,
    captured_on DATE NOT NULL,
    brain_ref TEXT
);

-- A concrete door: where one or more access routes (care_paths A1..A8) go in an area.
CREATE TABLE sp_points (
    id BIGSERIAL PRIMARY KEY,
    county_id TEXT NOT NULL REFERENCES counties (id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    kind TEXT NOT NULL,
    routes TEXT[] NOT NULL,
    name_fi TEXT NOT NULL,
    name_en TEXT,
    city TEXT,
    phone TEXT,
    hours TEXT,
    contact_note TEXT,
    callback BOOLEAN,
    walk_in TEXT,
    digital_channel TEXT,
    digital_login TEXT,
    service_languages TEXT[],
    interpreter_how TEXT,
    fee_note TEXT,
    url TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'disputed', 'stale')),
    verified_on DATE,
    source_id BIGINT REFERENCES sp_sources (id),
    sort INTEGER NOT NULL DEFAULT 0,
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (county_id, key)
);

-- How one stage of the path works in one area.
CREATE TABLE sp_steps (
    county_id TEXT NOT NULL REFERENCES counties (id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    point_id BIGINT REFERENCES sp_points (id) ON DELETE SET NULL,
    informed_by TEXT,
    portal TEXT,
    if_nothing_heard TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'disputed', 'stale')),
    verified_on DATE,
    source_id BIGINT REFERENCES sp_sources (id),
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (county_id, stage)
);

CREATE TABLE sp_screening (
    county_id TEXT NOT NULL REFERENCES counties (id) ON DELETE CASCADE,
    cancer TEXT NOT NULL CHECK (cancer IN ('breast', 'cervical', 'colorectal')),
    ages TEXT NOT NULL,
    provider TEXT,
    invitation_channel TEXT,
    info_languages TEXT[],
    followup_point_id BIGINT REFERENCES sp_points (id) ON DELETE SET NULL,
    self_sampling BOOLEAN,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'disputed', 'stale')),
    verified_on DATE,
    source_id BIGINT REFERENCES sp_sources (id),
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (county_id, cancer)
);

-- Measured values. area is a county id or 'finland' (the national baseline), so no FK.
CREATE TABLE sp_metrics (
    id BIGSERIAL PRIMARY KEY,
    area TEXT NOT NULL,
    stage TEXT NOT NULL,
    metric TEXT NOT NULL,
    definition TEXT NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    period TEXT NOT NULL,
    better TEXT NOT NULL CHECK (better IN ('lower', 'higher')),
    scope TEXT NOT NULL CHECK (scope IN ('area', 'hospital_district', 'national')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'disputed', 'stale')),
    source_id BIGINT NOT NULL REFERENCES sp_sources (id),
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (area, metric, period)
);

-- Sourced bottlenecks for the report.
CREATE TABLE sp_findings (
    id BIGSERIAL PRIMARY KEY,
    county_id TEXT NOT NULL REFERENCES counties (id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    stage TEXT NOT NULL,
    barrier TEXT,
    finding TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'disputed', 'stale')),
    verified_on DATE,
    source_id BIGINT NOT NULL REFERENCES sp_sources (id),
    updated_by TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (county_id, key)
);

CREATE INDEX sp_metrics_metric_idx ON sp_metrics (metric, period);
