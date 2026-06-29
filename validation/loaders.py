"""Load JSON datasets and parse TypeScript references for validation."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from validation.config import DATASETS_DIR, REGISTRY_FILE, STORIES_FILE, UPDATE_HISTORY_FILE


def load_json_datasets() -> dict[str, dict[str, Any]]:
    datasets: dict[str, dict[str, Any]] = {}
    for path in sorted(DATASETS_DIR.glob("*.json")):
        with open(path, encoding="utf-8") as f:
            datasets[path.stem] = json.load(f)
    return datasets


def all_statistics(datasets: dict[str, dict[str, Any]]) -> list[tuple[str, dict[str, Any]]]:
    """Return (source_file_slug, statistic) pairs."""
    stats: list[tuple[str, dict[str, Any]]] = []
    for slug, data in datasets.items():
        for stat in data.get("statistics", []):
            stats.append((slug, stat))
    return stats


def parse_registry_stat_ids() -> dict[str, list[str]]:
    """Parse statIds arrays from registry.ts (lightweight regex)."""
    text = REGISTRY_FILE.read_text(encoding="utf-8")
    entries: dict[str, list[str]] = {}
    # Match id: 'slug' ... statIds: [...]
    blocks = re.split(r"\{\s*\n\s*id:\s*'([^']+)'", text)[1:]
    for i in range(0, len(blocks) - 1, 2):
        slug = blocks[i]
        block = blocks[i + 1]
        m = re.search(r"statIds:\s*\[([^\]]*)\]", block, re.DOTALL)
        if not m:
            entries[slug] = []
            continue
        ids = re.findall(r"'([^']+)'", m.group(1))
        entries[slug] = ids
    return entries


def parse_registry_category_ids() -> dict[str, str | None]:
    text = REGISTRY_FILE.read_text(encoding="utf-8")
    entries: dict[str, str | None] = {}
    blocks = re.split(r"\{\s*\n\s*id:\s*'([^']+)'", text)[1:]
    for i in range(0, len(blocks) - 1, 2):
        slug = blocks[i]
        block = blocks[i + 1]
        m = re.search(r"categoryId:\s*'([^']+)'", block)
        if m:
            entries[slug] = m.group(1)
        elif "categoryId: undefined" in block:
            entries[slug] = None
    return entries


def parse_story_stat_references() -> set[str]:
    text = STORIES_FILE.read_text(encoding="utf-8")
    return set(re.findall(r"'([a-z0-9-]+)'", text)) & set(
        re.findall(r"relatedStatIds|statCallouts", text) and re.findall(
            r"(?:relatedStatIds|statCallouts)[^\[]*\[([^\]]+)\]", text, re.DOTALL
        )
        or []
    )


def parse_story_stat_ids() -> set[str]:
    text = STORIES_FILE.read_text(encoding="utf-8")
    ids: set[str] = set()
    for block in re.findall(
        r"(?:relatedStatIds|statCallouts)\s*:\s*\[([^\]]+)\]", text, re.DOTALL
    ):
        ids.update(re.findall(r"'([a-z0-9-]+)'", block))
    return ids


def parse_update_history_dataset_ids() -> set[str]:
    text = UPDATE_HISTORY_FILE.read_text(encoding="utf-8")
    return set(re.findall(r"datasetId:\s*'([^']+)'", text))
