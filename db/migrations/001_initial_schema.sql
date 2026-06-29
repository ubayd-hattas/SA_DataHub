-- SA Data Hub — Phase 1 initial schema
-- Fact/dimension model for time-series statistics, geography hierarchy,
-- municipality profiles, and authored content.
-- Safe to run on a clean Neon database.

BEGIN;

-- ─── Migration tracking ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schema_migrations (
    version     TEXT        PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE schema_migrations IS
    'Tracks applied SQL migration files (filename stem, e.g. 001_initial_schema).';

-- ─── Reference dimensions ─────────────────────────────────────────────────────

CREATE TABLE data_sources (
    source_id   SERIAL      PRIMARY KEY,
    name        TEXT        NOT NULL,
    short_name  TEXT        NOT NULL,
    url         TEXT,
    notes       TEXT
);

COMMENT ON TABLE data_sources IS
    'Official data providers (Stats SA, SARB, SAPS, DBE, World Bank).';

CREATE TABLE categories (
    id          TEXT        PRIMARY KEY,
    label       TEXT        NOT NULL,
    description TEXT        NOT NULL,
    icon        TEXT        NOT NULL,
    color       TEXT,
    bg_color    TEXT,
    sort_order  SMALLINT    NOT NULL DEFAULT 0
);

COMMENT ON TABLE categories IS
    'UI category pages — maps to /category/[slug].';

CREATE TABLE geographies (
    geography_id          SERIAL      PRIMARY KEY,
    code                  TEXT        NOT NULL UNIQUE,
    name                  TEXT        NOT NULL,
    level                 TEXT        NOT NULL,
    parent_id             INT         REFERENCES geographies (geography_id),
    slug                  TEXT        UNIQUE,
    municipality_category CHAR(1),
    province_code         CHAR(3),

    CONSTRAINT geographies_level_check CHECK (
        level IN ('national', 'province', 'municipality', 'district')
    ),
    CONSTRAINT geographies_municipality_category_check CHECK (
        municipality_category IS NULL OR municipality_category IN ('A', 'B', 'C')
    )
);

COMMENT ON TABLE geographies IS
    'National → province → municipality hierarchy. Self-referencing parent_id.';
COMMENT ON COLUMN geographies.code IS
    'Official code: ZA, WC, CPT, WC011.';
COMMENT ON COLUMN geographies.slug IS
    'URL slug for provinces only (e.g. western-cape).';

-- ─── Datasets & facts ─────────────────────────────────────────────────────────

CREATE TABLE datasets (
    dataset_id        SERIAL       PRIMARY KEY,
    slug              TEXT         NOT NULL,
    stat_id           TEXT         NOT NULL UNIQUE,
    name              TEXT         NOT NULL,
    description       TEXT,
    category_id       TEXT         REFERENCES categories (id),
    source_id         INT          REFERENCES data_sources (source_id),
    unit              TEXT         NOT NULL,
    cadence           TEXT         NOT NULL,
    automation_level  TEXT         NOT NULL,
    geographic_level  TEXT         NOT NULL DEFAULT 'national',
    publication_name  TEXT,
    source_url        TEXT,
    notes             TEXT,
    series_start_label TEXT,
    series_end_label   TEXT,
    search_vector     TSVECTOR     GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
    ) STORED,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT datasets_cadence_check CHECK (
        cadence IN ('monthly', 'quarterly', 'annual', 'decennial', 'static', 'ad_hoc')
    ),
    CONSTRAINT datasets_automation_level_check CHECK (
        automation_level IN ('auto', 'semi-auto', 'manual', 'static')
    ),
    CONSTRAINT datasets_geographic_level_check CHECK (
        geographic_level IN ('national', 'provincial', 'municipal')
    )
);

COMMENT ON TABLE datasets IS
    'One row per Statistic.id. slug groups rows by registry JSON file stem (not unique).';
COMMENT ON COLUMN datasets.slug IS
    'Registry / JSON filename stem (e.g. unemployment). Multiple stats share one slug.';
COMMENT ON COLUMN datasets.stat_id IS
    'App statistic ID (e.g. unemployment-national) — primary ETL lookup key.';

CREATE TABLE dataset_versions (
    version_id            SERIAL       PRIMARY KEY,
    dataset_id            INT          REFERENCES datasets (dataset_id),
    slug                  TEXT,
    fetched_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    source_snapshot_path  TEXT,
    row_count             INT,
    status                TEXT         NOT NULL,
    notes                 TEXT,
    duration_ms           INT,

    CONSTRAINT dataset_versions_status_check CHECK (
        status IN ('success', 'partial', 'failed')
    )
);

COMMENT ON TABLE dataset_versions IS
    'ETL audit log — one row per pipeline run or dataset load.';

CREATE TABLE observations (
    observation_id   BIGSERIAL    PRIMARY KEY,
    dataset_id       INT          NOT NULL REFERENCES datasets (dataset_id),
    geography_id     INT          NOT NULL REFERENCES geographies (geography_id),
    period_start     DATE         NOT NULL,
    period_label     TEXT         NOT NULL,
    value            NUMERIC      NOT NULL,
    secondary_value  NUMERIC,
    is_estimate      BOOLEAN      NOT NULL DEFAULT FALSE,
    version_id       INT          REFERENCES dataset_versions (version_id),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE observations IS
    'Central fact table — time-series values (dataset × geography × period).';

CREATE TABLE statistic_snapshots (
    stat_id        TEXT         PRIMARY KEY REFERENCES datasets (stat_id),
    display_value  TEXT         NOT NULL,
    raw_value      NUMERIC      NOT NULL,
    change         NUMERIC,
    change_label   TEXT,
    trend          TEXT         NOT NULL,
    last_updated   DATE         NOT NULL,
    computed_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT statistic_snapshots_trend_check CHECK (
        trend IN ('up', 'down', 'stable')
    )
);

COMMENT ON TABLE statistic_snapshots IS
    'Materialised headline values derived from the latest observations.';

-- ─── Geography profiles ───────────────────────────────────────────────────────

CREATE TABLE municipality_profiles (
    municipality_code       TEXT           PRIMARY KEY,
    geography_id            INT            NOT NULL REFERENCES geographies (geography_id),
    name                    TEXT           NOT NULL,
    province_code           CHAR(3)        NOT NULL,
    category                CHAR(1)        NOT NULL,
    census_year             SMALLINT       NOT NULL DEFAULT 2022,
    profile_data            JSONB          NOT NULL,
    population_2022         INT,
    population_density_2022 NUMERIC(10, 1),
    last_updated            DATE           NOT NULL,
    erratum_applied         BOOLEAN        NOT NULL DEFAULT FALSE,
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),

    CONSTRAINT municipality_profiles_category_check CHECK (
        category IN ('A', 'B', 'C')
    )
);

COMMENT ON TABLE municipality_profiles IS
    'Census 2022 wide profiles — populated in Phase 2 ETL.';

CREATE TABLE province_snapshots (
    province_slug      TEXT           PRIMARY KEY,
    geography_id       INT            NOT NULL REFERENCES geographies (geography_id),
    snapshot_data      JSONB          NOT NULL,
    unemployment_rate  NUMERIC(5, 1),
    unemployment_rank  SMALLINT,
    population         INT,
    period_label       TEXT,
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT now()
);

COMMENT ON TABLE province_snapshots IS
    'Composite province profile blobs — populated in Phase 2 ETL.';

-- ─── Audit & content ──────────────────────────────────────────────────────────

CREATE TABLE update_events (
    event_id      SERIAL       PRIMARY KEY,
    dataset_slug  TEXT         NOT NULL,
    event_date    DATE         NOT NULL,
    event_type    TEXT         NOT NULL,
    summary       TEXT         NOT NULL,
    source_url    TEXT,

    CONSTRAINT update_events_type_check CHECK (
        event_type IN ('data-update', 'methodology-change', 'new-dataset', 'correction')
    )
);

COMMENT ON TABLE update_events IS
    'Human-readable dataset update history for /updates.';

CREATE TABLE stories (
    slug                  TEXT         PRIMARY KEY,
    title                 TEXT         NOT NULL,
    subtitle              TEXT,
    category              TEXT         NOT NULL,
    category_label        TEXT         NOT NULL,
    summary               TEXT         NOT NULL,
    reading_time_minutes  SMALLINT     NOT NULL,
    published_date        DATE         NOT NULL,
    last_updated          DATE         NOT NULL,
    featured              BOOLEAN      NOT NULL DEFAULT FALSE,
    cover_emoji           TEXT,
    tags                  TEXT[],
    related_stat_ids      TEXT[],
    related_slugs         TEXT[]
);

COMMENT ON TABLE stories IS
    'Authored data stories — optional seed in Phase 1; pages still read stories.ts.';

CREATE TABLE story_sections (
    section_id     SERIAL       PRIMARY KEY,
    story_slug     TEXT         NOT NULL REFERENCES stories (slug) ON DELETE CASCADE,
    sort_order     SMALLINT     NOT NULL,
    section_key    TEXT         NOT NULL,
    heading        TEXT         NOT NULL,
    body           TEXT         NOT NULL,
    highlight      TEXT,
    stat_callouts  TEXT[]
);

COMMENT ON TABLE story_sections IS
    'Ordered sections within a data story.';

CREATE TABLE platform_changelog (
    version       TEXT         PRIMARY KEY,
    release_date  DATE         NOT NULL,
    title         TEXT         NOT NULL,
    summary       TEXT         NOT NULL,
    features      TEXT[]       NOT NULL
);

COMMENT ON TABLE platform_changelog IS
    'App release notes — distinct from dataset update_events.';

COMMIT;
