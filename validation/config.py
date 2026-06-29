"""Shared paths and constants for SA Data Hub validation."""

from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASETS_DIR = PROJECT_ROOT / "src" / "data" / "datasets"
STORIES_FILE = PROJECT_ROOT / "src" / "data" / "stories.ts"
UPDATE_HISTORY_FILE = PROJECT_ROOT / "src" / "data" / "update-history.ts"
MOCK_FILE = PROJECT_ROOT / "src" / "data" / "mock.ts"
REGISTRY_FILE = PROJECT_ROOT / "src" / "lib" / "registry.ts"

VALID_CATEGORY_IDS = {
    "unemployment",
    "crime",
    "inflation",
    "education",
    "population",
    "housing",
    "gdp",
    "census",
}

VALID_TRENDS = {"up", "down", "stable"}

VALID_AUTOMATION_LEVELS = {"auto", "semi-auto", "manual", "static"}

# Registry dataset slugs (filename stems with JSON files)
REGISTRY_DATASET_SLUGS = {
    "unemployment",
    "youth-unemployment",
    "labour-force",
    "inflation",
    "gdp",
    "interest-rates",
    "crime",
    "education",
    "population",
    "housing",
    "census",
    "provinces",
}

PROVINCE_SLUGS = {
    "western-cape",
    "gauteng",
    "kwazulu-natal",
    "eastern-cape",
    "limpopo",
    "mpumalanga",
    "north-west",
    "free-state",
    "northern-cape",
}

PROVINCE_CODES = {"EC", "FS", "GP", "KZN", "LP", "MP", "NC", "NW", "WC"}

REQUIRED_STAT_FIELDS = {
    "id",
    "categoryId",
    "title",
    "value",
    "rawValue",
    "unit",
    "change",
    "changeLabel",
    "trend",
    "description",
    "source",
    "lastUpdated",
}

REQUIRED_SOURCE_FIELDS = {"name", "shortName", "url"}

REQUIRED_META_FIELDS = {
    "source",
    "source_url",
    "update_frequency",
    "last_verified",
    "notes",
}
