-- County figures for the county view. Owner: regions. Seeded for Helsinki only;
-- values copied from the junction2026 brain sources named in each row.
CREATE TABLE counties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE county_figures (
    id BIGSERIAL PRIMARY KEY,
    county_id TEXT NOT NULL REFERENCES counties (id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    year INTEGER,
    source TEXT NOT NULL,
    sort INTEGER NOT NULL
);

CREATE TABLE county_languages (
    county_id TEXT NOT NULL REFERENCES counties (id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    language TEXT NOT NULL,
    source TEXT NOT NULL,
    PRIMARY KEY (county_id, rank)
);

INSERT INTO counties (id, name) VALUES ('helsinki', 'Helsingin kaupunki / City of Helsinki');

INSERT INTO county_figures (county_id, label, value, unit, year, source, sort) VALUES
    ('helsinki', 'Foreign-language share of residents', 21.2, '%', 2025,
     'Statistics Finland, table 11rm (language by municipality, 31 Dec 2025)', 1),
    ('helsinki', 'Foreign-language residents', 147482, 'people', 2025,
     'Statistics Finland, table 11rm (language by municipality, 31 Dec 2025)', 2),
    ('helsinki', 'Breast cancer screening participation', 74.3, '%', 2024,
     'Sotkanet indicator 3621', 3),
    ('helsinki', 'Cervical cancer screening participation', 71.4, '%', NULL,
     'Sotkanet indicator 3620 (latest year)', 4),
    ('helsinki', 'Colorectal cancer screening (FIT) participation', 69.6, '%', 2024,
     'Finnish Cancer Registry, mass-screening statistics, screening year 2024', 5),
    ('helsinki', 'Non-urgent primary-care doctor visits waiting over 7 days', 75.9, '%', 2025,
     'Sotkanet indicator 6411', 6),
    ('helsinki', 'National target: screening participation in every programme', 80, '%', NULL,
     'National Cancer Strategy, Goal 2 (AstraZeneca challenge brief)', 7);

INSERT INTO county_languages (county_id, rank, language, source) VALUES
    ('helsinki', 1, 'Russian', 'Statistics Finland, table 11rm (2025)'),
    ('helsinki', 2, 'Somali', 'Statistics Finland, table 11rm (2025)'),
    ('helsinki', 3, 'Arabic', 'Statistics Finland, table 11rm (2025)'),
    ('helsinki', 4, 'English', 'Statistics Finland, table 11rm (2025)'),
    ('helsinki', 5, 'Estonian', 'Statistics Finland, table 11rm (2025)');
