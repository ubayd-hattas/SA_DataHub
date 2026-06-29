-- SA Data Hub — indexes and supporting views
-- Requires 001_initial_schema.sql.

BEGIN;

-- ─── Extensions ───────────────────────────────────────────────────────────────
-- pg_trgm enables municipality name search (used when profiles are loaded).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Geography ────────────────────────────────────────────────────────────────

CREATE INDEX idx_geographies_parent ON geographies (parent_id);
CREATE INDEX idx_geographies_level ON geographies (level);
CREATE INDEX idx_geographies_slug ON geographies (slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_geographies_province_code ON geographies (province_code)
    WHERE province_code IS NOT NULL;

-- ─── Datasets ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_datasets_slug ON datasets (slug);
CREATE INDEX idx_datasets_category ON datasets (category_id);
CREATE INDEX idx_datasets_source ON datasets (source_id);
CREATE INDEX idx_datasets_search ON datasets USING GIN (search_vector);

-- ─── Observations ───────────────────────────────────────────────────────────────

CREATE INDEX idx_observations_dataset_geo_period
    ON observations (dataset_id, geography_id, period_start);

CREATE INDEX idx_observations_latest
    ON observations (dataset_id, geography_id, period_start DESC);

CREATE INDEX idx_observations_version ON observations (version_id)
    WHERE version_id IS NOT NULL;

-- ─── Dataset versions ─────────────────────────────────────────────────────────

CREATE INDEX idx_dataset_versions_dataset ON dataset_versions (dataset_id);
CREATE INDEX idx_dataset_versions_fetched ON dataset_versions (fetched_at DESC);

-- ─── Municipality profiles ────────────────────────────────────────────────────

CREATE INDEX idx_muni_profiles_geography ON municipality_profiles (geography_id);
CREATE INDEX idx_muni_profiles_province ON municipality_profiles (province_code);
CREATE INDEX idx_muni_profiles_category ON municipality_profiles (category);
CREATE INDEX idx_muni_profiles_population ON municipality_profiles (population_2022 DESC NULLS LAST);
CREATE INDEX idx_muni_profiles_name_trgm ON municipality_profiles USING GIN (name gin_trgm_ops);

-- ─── Province snapshots ─────────────────────────────────────────────────────────

CREATE INDEX idx_province_snapshots_geography ON province_snapshots (geography_id);

-- ─── Update events ────────────────────────────────────────────────────────────

CREATE INDEX idx_update_events_slug_date ON update_events (dataset_slug, event_date DESC);

-- ─── Story sections ───────────────────────────────────────────────────────────

CREATE INDEX idx_story_sections_story ON story_sections (story_slug, sort_order);

-- ─── Views ────────────────────────────────────────────────────────────────────

CREATE VIEW v_latest_observations AS
SELECT DISTINCT ON (dataset_id, geography_id)
    observation_id,
    dataset_id,
    geography_id,
    period_start,
    period_label,
    value,
    secondary_value
FROM observations
ORDER BY dataset_id, geography_id, period_start DESC;

COMMENT ON VIEW v_latest_observations IS
    'Most recent observation per dataset and geography.';

CREATE VIEW v_dataset_freshness AS
SELECT
    d.dataset_id,
    d.slug,
    d.stat_id,
    d.name,
    d.cadence,
    dv.fetched_at AS last_fetched_at,
    dv.status     AS last_load_status,
    dv.row_count  AS last_row_count
FROM datasets d
LEFT JOIN LATERAL (
    SELECT fetched_at, status, row_count
    FROM dataset_versions
    WHERE dataset_id = d.dataset_id
    ORDER BY fetched_at DESC
    LIMIT 1
) dv ON TRUE;

COMMENT ON VIEW v_dataset_freshness IS
    'Latest ETL version metadata per dataset for registry freshness.';

COMMIT;
