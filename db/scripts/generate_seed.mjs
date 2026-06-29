#!/usr/bin/env node
/**
 * Generates db/migrations/004_seed_reference_data.sql from JSON sources.
 *
 * Usage: node db/scripts/generate_seed.mjs
 *
 * Re-run after changing categories, registry statistics, or geography JSON.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const DATASETS = join(ROOT, 'src', 'data', 'datasets')
const OUT = join(ROOT, 'db', 'migrations', '004_seed_reference_data.sql')

const PROVINCE_CODE_TO_SLUG = {
  EC: 'eastern-cape',
  FS: 'free-state',
  GP: 'gauteng',
  KZN: 'kwazulu-natal',
  LP: 'limpopo',
  MP: 'mpumalanga',
  NC: 'northern-cape',
  NW: 'north-west',
  WC: 'western-cape',
}

const PROVINCE_NAMES = {
  EC: 'Eastern Cape',
  FS: 'Free State',
  GP: 'Gauteng',
  KZN: 'KwaZulu-Natal',
  LP: 'Limpopo',
  MP: 'Mpumalanga',
  NC: 'Northern Cape',
  NW: 'North West',
  WC: 'Western Cape',
}

const CATEGORIES = [
  { id: 'unemployment', label: 'Unemployment', description: 'Labour force participation, jobless rates and employment trends across provinces.', icon: 'Briefcase', color: 'text-orange-600 dark:text-orange-400', bg_color: 'bg-orange-50 dark:bg-orange-950/30', sort_order: 1 },
  { id: 'gdp', label: 'GDP & Economy', description: 'Gross domestic product, economic growth, interest rates and sectoral output data.', icon: 'TrendingUp', color: 'text-brand-600 dark:text-brand-400', bg_color: 'bg-brand-50 dark:bg-brand-950/30', sort_order: 2 },
  { id: 'inflation', label: 'Inflation & Prices', description: 'Consumer price index, producer prices and purchasing power trends.', icon: 'ShoppingCart', color: 'text-red-600 dark:text-red-400', bg_color: 'bg-red-50 dark:bg-red-950/30', sort_order: 3 },
  { id: 'crime', label: 'Crime', description: 'Crime statistics by category, province and reporting period.', icon: 'Shield', color: 'text-slate-600 dark:text-slate-400', bg_color: 'bg-slate-50 dark:bg-slate-950/30', sort_order: 4 },
  { id: 'education', label: 'Education', description: 'Matric pass rates, enrolment figures, literacy rates and tertiary education data.', icon: 'GraduationCap', color: 'text-blue-600 dark:text-blue-400', bg_color: 'bg-blue-50 dark:bg-blue-950/30', sort_order: 5 },
  { id: 'population', label: 'Population', description: 'Demographics, age distribution, migration and household composition.', icon: 'Users', color: 'text-violet-600 dark:text-violet-400', bg_color: 'bg-violet-50 dark:bg-violet-950/30', sort_order: 6 },
  { id: 'housing', label: 'Housing', description: 'Home ownership, informal settlements, housing delivery and access to services.', icon: 'Home', color: 'text-amber-600 dark:text-amber-400', bg_color: 'bg-amber-50 dark:bg-amber-950/30', sort_order: 7 },
  { id: 'census', label: 'Census 2022', description: 'Results from the South Africa Census 2022 conducted by Stats SA.', icon: 'BarChart3', color: 'text-teal-600 dark:text-teal-400', bg_color: 'bg-teal-50 dark:bg-teal-950/30', sort_order: 8 },
]

const DATA_SOURCES = [
  { name: 'Statistics South Africa', short_name: 'Stats SA', url: 'https://www.statssa.gov.za', notes: 'Primary national statistical office. Headline macroeconomic indicators originate here.' },
  { name: 'South African Reserve Bank', short_name: 'SARB', url: 'https://www.resbank.co.za', notes: 'Authoritative source for monetary policy and financial indicators.' },
  { name: 'Department of Basic Education', short_name: 'DBE', url: 'https://www.education.gov.za', notes: 'Annual matric (NSC) results and provincial education statistics.' },
  { name: 'South African Police Service', short_name: 'SAPS', url: 'https://www.saps.gov.za/services/crimestats.php', notes: 'Annual crime statistics released each September.' },
  { name: 'World Bank Open Data', short_name: 'World Bank', url: 'https://data.worldbank.org/country/ZA', notes: 'Long-run time series and international comparisons; may lag Stats SA.' },
]

const SOURCE_SHORT_TO_ID = Object.fromEntries(
  DATA_SOURCES.map((s, i) => [s.short_name, i + 1])
)

const DATASET_FILES = [
  'unemployment',
  'youth-unemployment',
  'labour-force',
  'inflation',
  'gdp',
  'interest-rates',
  'crime',
  'education',
  'population',
  'housing',
  'census',
]

const AUTOMATION_BY_SLUG = {
  unemployment: 'semi-auto',
  'youth-unemployment': 'semi-auto',
  'labour-force': 'semi-auto',
  inflation: 'semi-auto',
  gdp: 'semi-auto',
  'interest-rates': 'semi-auto',
  crime: 'manual',
  education: 'manual',
  population: 'auto',
  housing: 'manual',
  census: 'static',
}

function sqlStr(value) {
  if (value == null) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

function normalizeCadence(freq) {
  if (!freq) return 'static'
  const lower = freq.toLowerCase()
  if (lower.includes('month')) return 'monthly'
  if (lower.includes('quarter')) return 'quarterly'
  if (lower.includes('decennial') || lower.includes('census')) return 'decennial'
  if (lower.includes('annual') || lower.includes('year')) return 'annual'
  if (lower.includes('static')) return 'static'
  if (lower.includes('mpc') || lower.includes('meeting')) return 'ad_hoc'
  return 'annual'
}

function escapeSql(value) {
  return String(value).replace(/'/g, "''")
}

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATASETS, `${name}.json`), 'utf8'))
}

function buildDatasetRows() {
  const rows = []
  for (const slug of DATASET_FILES) {
    const data = loadJson(slug)
    const meta = data._meta ?? {}
    const metaCadence = normalizeCadence(meta.update_frequency)

    for (const stat of data.statistics ?? []) {
      const sourceShort = stat.source?.shortName ?? 'Stats SA'
      const sourceId = SOURCE_SHORT_TO_ID[sourceShort] ?? 1
      rows.push({
        slug,
        stat_id: stat.id,
        name: stat.title,
        description: stat.description ?? null,
        category_id: stat.categoryId,
        source_id: sourceId,
        unit: stat.unit ?? '%',
        cadence: metaCadence,
        automation_level: AUTOMATION_BY_SLUG[slug] ?? 'semi-auto',
        geographic_level: 'national',
        publication_name: stat.source?.publicationName ?? null,
        source_url: stat.source?.url ?? meta.source_url ?? null,
        notes: meta.notes ?? null,
        series_start_label: stat.series?.[0]?.data?.[0]?.label ?? null,
        series_end_label: stat.series?.[0]?.data?.at(-1)?.label ?? null,
      })
    }
  }
  return rows
}

function buildGeographySql() {
  const municipalities = loadJson('municipalities').municipalities
  const lines = []

  lines.push(`INSERT INTO geographies (code, name, level, parent_id, slug, province_code)
VALUES ('ZA', 'South Africa', 'national', NULL, NULL, NULL);`)

  for (const [code, slug] of Object.entries(PROVINCE_CODE_TO_SLUG)) {
    lines.push(`INSERT INTO geographies (code, name, level, parent_id, slug, province_code)
SELECT ${sqlStr(code)}, ${sqlStr(PROVINCE_NAMES[code])}, 'province', g.geography_id, ${sqlStr(slug)}, ${sqlStr(code)}
FROM geographies g WHERE g.code = 'ZA';`)
  }

  const muniValues = municipalities.map((m) =>
    `(${sqlStr(m.id)}, ${sqlStr(m.name)}, ${sqlStr(m.category)}, ${sqlStr(m.province)})`
  )

  // Batch inserts for readability and performance
  const BATCH = 50
  for (let i = 0; i < muniValues.length; i += BATCH) {
    const batch = muniValues.slice(i, i + BATCH).join(',\n    ')
    lines.push(`INSERT INTO geographies (code, name, level, parent_id, municipality_category, province_code)
SELECT v.code, v.name, 'municipality', p.geography_id, v.category, v.province_code
FROM (VALUES
    ${batch}
) AS v(code, name, category, province_code)
JOIN geographies p ON p.code = v.province_code AND p.level = 'province';`)
  }

  return lines.join('\n\n')
}

function main() {
  const datasets = buildDatasetRows()

  const parts = [
    '-- SA Data Hub — reference seed data (Phase 1)',
    '-- Generated by db/scripts/generate_seed.mjs — do not edit by hand.',
    '-- Re-generate: node db/scripts/generate_seed.mjs',
    '-- Sources: mock.ts categories, methodology page, registry JSON files, provinces/municipalities JSON.',
    '',
    'BEGIN;',
    '',
    '-- ─── Categories ─────────────────────────────────────────────────────────────',
    '',
    `INSERT INTO categories (id, label, description, icon, color, bg_color, sort_order) VALUES`,
    CATEGORIES.map((c) =>
      `    (${sqlStr(c.id)}, ${sqlStr(c.label)}, ${sqlStr(c.description)}, ${sqlStr(c.icon)}, ${sqlStr(c.color)}, ${sqlStr(c.bg_color)}, ${c.sort_order})`
    ).join(',\n') + ';',
    '',
    '-- ─── Data sources ───────────────────────────────────────────────────────────',
    '',
    `INSERT INTO data_sources (source_id, name, short_name, url, notes) VALUES`,
    DATA_SOURCES.map((s, i) =>
      `    (${i + 1}, ${sqlStr(s.name)}, ${sqlStr(s.short_name)}, ${sqlStr(s.url)}, ${sqlStr(s.notes)})`
    ).join(',\n') + ';',
    '',
    '-- Reset serial after explicit source_id inserts',
    `SELECT setval(pg_get_serial_sequence('data_sources', 'source_id'), (SELECT MAX(source_id) FROM data_sources));`,
    '',
    '-- ─── Geographies (ZA + 9 provinces + 213 municipalities) ────────────────────',
    '',
    buildGeographySql(),
    '',
    '-- ─── Dataset metadata (34 statistics — no observations) ─────────────────────',
    '',
    `INSERT INTO datasets (`,
    '    slug, stat_id, name, description, category_id, source_id,',
    '    unit, cadence, automation_level, geographic_level,',
    '    publication_name, source_url, notes, series_start_label, series_end_label',
    ') VALUES',
    datasets.map((d) => [
      `    (${sqlStr(d.slug)}`,
      `${sqlStr(d.stat_id)}`,
      `${sqlStr(d.name)}`,
      `${sqlStr(d.description)}`,
      `${sqlStr(d.category_id)}`,
      `${d.source_id}`,
      `${sqlStr(d.unit)}`,
      `${sqlStr(d.cadence)}`,
      `${sqlStr(d.automation_level)}`,
      `${sqlStr(d.geographic_level)}`,
      `${sqlStr(d.publication_name)}`,
      `${sqlStr(d.source_url)}`,
      `${sqlStr(d.notes)}`,
      `${sqlStr(d.series_start_label)}`,
      `${sqlStr(d.series_end_label)})`,
    ].join(', ')).join(',\n') + ';',
    '',
    'COMMIT;',
    '',
  ]

  writeFileSync(OUT, parts.join('\n'), 'utf8')
  console.log(`Wrote ${OUT}`)
  console.log(`  Categories: ${CATEGORIES.length}`)
  console.log(`  Data sources: ${DATA_SOURCES.length}`)
  console.log(`  Geographies: ${1 + Object.keys(PROVINCE_CODE_TO_SLUG).length} + ${loadJson('municipalities').municipalities.length} municipalities`)
  console.log(`  Datasets: ${datasets.length}`)
}

main()
