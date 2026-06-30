#!/usr/bin/env node
/**
 * Quick verification of ETL-loaded data in PostgreSQL.
 *
 * Usage: npm run etl:verify unemployment
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const PIPELINE_CONFIG = {
  unemployment: {
    slug: 'unemployment',
    statIds: ['unemployment-national', 'youth-unemployment', 'labour-force-participation'],
    geographyCode: 'ZA',
    jsonPath: 'src/data/datasets/unemployment.json',
  },
  'youth-unemployment': {
    slug: 'youth-unemployment',
    statIds: [
      'youth-unemployment-narrow',
      'youth-unemployment-1524',
      'youth-unemployment-expanded',
      'youth-neet-rate',
    ],
    geographyCode: 'ZA',
    jsonPath: 'src/data/datasets/youth-unemployment.json',
  },
}

function loadEnvLocal() {
  if (process.env.DATABASE_URL) return
  const envPath = join(ROOT, '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function countJsonObservations(jsonPath) {
  const data = JSON.parse(readFileSync(join(ROOT, jsonPath), 'utf8'))
  let count = 0
  for (const stat of data.statistics ?? []) {
    for (const series of stat.series ?? []) {
      count += series.data?.length ?? 0
    }
  }
  return count
}

async function verify(slug) {
  const config = PIPELINE_CONFIG[slug]
  if (!config) {
    console.error(`Unknown dataset: ${slug}`)
    console.error(`Available: ${Object.keys(PIPELINE_CONFIG).join(', ')}`)
    process.exit(1)
  }

  loadEnvLocal()
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }

  const sql = postgres(process.env.DATABASE_URL, {
    ssl: 'require',
    prepare: false,
    max: 1,
  })

  try {
    console.log(`\nETL Verification — ${slug}`)
    console.log('='.repeat(48))

    const datasets = await sql`
      SELECT dataset_id, stat_id, name, slug
      FROM datasets
      WHERE stat_id = ANY(${config.statIds})
      ORDER BY stat_id
    `

    if (datasets.length === 0) {
      console.log('FAIL No dataset rows found (run db:migrate and check seed)')
      return
    }

    console.log(`\nDatasets found: ${datasets.length}`)
    for (const d of datasets) {
      console.log(`  • ${d.stat_id} (id=${d.dataset_id}, slug=${d.slug})`)
    }

    const geo = await sql`
      SELECT geography_id, code, name FROM geographies WHERE code = ${config.geographyCode}
    `
    if (!geo.length) {
      console.log(`\nFAIL Geography ${config.geographyCode} not found`)
      return
    }
    console.log(`\nGeography: ${geo[0].code} — ${geo[0].name}`)

    const expectedCount = countJsonObservations(config.jsonPath)

    for (const statId of config.statIds) {
      const rows = await sql`
        SELECT o.period_label, o.period_start, o.value
        FROM observations o
        JOIN datasets d ON d.dataset_id = o.dataset_id
        JOIN geographies g ON g.geography_id = o.geography_id
        WHERE d.stat_id = ${statId} AND g.code = ${config.geographyCode}
        ORDER BY o.period_start ASC
      `

      console.log(`\n── ${statId} ──`)
      console.log(`  Observations: ${rows.length}`)

      if (rows.length === 0) {
        console.log('  FAIL No observations loaded — run: npm run etl -- unemployment --load')
        continue
      }

      const first = rows[0]
      const last = rows[rows.length - 1]
      console.log(`  First: ${first.period_label} = ${first.value}%`)
      console.log(`  Latest: ${last.period_label} = ${last.value}%`)

      console.log('  Sample (first 3):')
      for (const r of rows.slice(0, 3)) {
        console.log(`    ${r.period_label.padEnd(10)} ${r.value}%`)
      }
    }

    const total = await sql`
      SELECT COUNT(*)::int AS n
      FROM observations o
      JOIN datasets d ON d.dataset_id = o.dataset_id
      WHERE d.stat_id = ANY(${config.statIds})
    `

    console.log(`\nTotal observations: ${total[0].n} (JSON baseline: ${expectedCount})`)
    if (total[0].n === expectedCount) {
      console.log('OK Observation count matches JSON')
    } else {
      console.log('FAIL Observation count mismatch')
    }

    const version = await sql`
      SELECT version_id, fetched_at, row_count, status
      FROM dataset_versions
      WHERE slug = ${config.slug}
      ORDER BY fetched_at DESC
      LIMIT 1
    `
    if (version.length) {
      console.log(`\nLatest ETL version: #${version[0].version_id} (${version[0].status}, ${version[0].row_count} rows)`)
    }

    const snapshots = await sql`
      SELECT stat_id, display_value, raw_value, trend
      FROM statistic_snapshots
      WHERE stat_id = ANY(${config.statIds})
      ORDER BY stat_id
    `
    if (snapshots.length) {
      console.log(`\nStatistic snapshots: ${snapshots.length}`)
      for (const s of snapshots) {
        console.log(`  • ${s.stat_id}: ${s.display_value} (${s.trend})`)
      }
    }

    console.log('\n' + '='.repeat(48))
  } finally {
    await sql.end()
  }
}

const slug = process.argv[2]
if (!slug) {
  console.error('Usage: npm run etl:verify <dataset-slug>')
  process.exit(1)
}

verify(slug).catch((err) => {
  console.error(err)
  process.exit(1)
})
