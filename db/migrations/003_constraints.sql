-- SA Data Hub — additional constraints
-- Requires 001_initial_schema.sql and 002_indexes.sql.

BEGIN;

-- Idempotent observation upserts (natural key for ETL ON CONFLICT).
ALTER TABLE observations
    ADD CONSTRAINT uq_observations_dataset_geo_period
    UNIQUE (dataset_id, geography_id, period_start);

COMMENT ON CONSTRAINT uq_observations_dataset_geo_period ON observations IS
    'Natural key for idempotent ETL upserts.';

-- One profile row per municipality geography.
ALTER TABLE municipality_profiles
    ADD CONSTRAINT uq_municipality_profiles_geography
    UNIQUE (geography_id);

-- One snapshot row per province geography.
ALTER TABLE province_snapshots
    ADD CONSTRAINT uq_province_snapshots_geography
    UNIQUE (geography_id);

-- Story sections: unique ordering within a story.
ALTER TABLE story_sections
    ADD CONSTRAINT uq_story_sections_story_order
    UNIQUE (story_slug, sort_order);

ALTER TABLE story_sections
    ADD CONSTRAINT uq_story_sections_story_key
    UNIQUE (story_slug, section_key);

COMMIT;
