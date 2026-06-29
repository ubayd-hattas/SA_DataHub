/**
 * Applies numbered SQL migrations in db/migrations/ to the database
 * configured via DATABASE_URL.
 *
 * Usage:
 *   node db/migrate.mjs
 *   node db/migrate.mjs --status
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MIGRATIONS_DIR = join(__dirname, 'migrations')

/** Load .env.local into process.env when DATABASE_URL is not already set. */
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

loadEnvLocal()

function getMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

async function getAppliedVersions(sql) {
  try {
    const rows = await sql`SELECT version FROM schema_migrations ORDER BY version`
    return new Set(rows.map((r) => r.version))
  } catch (error) {
    // schema_migrations is created by 001_initial_schema.sql
    if (error.code === '42P01') return new Set()
    throw error
  }
}

async function applyMigration(sql, filename) {
  const version = filename.replace(/\.sql$/, '')
  const content = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8')

  console.log(`Applying ${filename}...`)

  // Each migration file manages its own transaction (BEGIN/COMMIT).
  await sql.unsafe(content)

  await sql`
    INSERT INTO schema_migrations (version)
    VALUES (${version})
    ON CONFLICT (version) DO NOTHING
  `

  console.log(`  ✓ ${filename}`)
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set. Add it to .env.local and retry.')
    process.exit(1)
  }

  const sql = postgres(databaseUrl, {
    ssl: 'require',
    prepare: false,
    max: 1,
  })

  try {
    const applied = await getAppliedVersions(sql)
    const files = getMigrationFiles()

    if (process.argv.includes('--status')) {
      for (const file of files) {
        const version = file.replace(/\.sql$/, '')
        const status = applied.has(version) ? 'applied' : 'pending'
        console.log(`${status.padEnd(8)} ${file}`)
      }
      return
    }

    const pending = files.filter((f) => !applied.has(f.replace(/\.sql$/, '')))

    if (pending.length === 0) {
      console.log('All migrations already applied.')
      return
    }

    for (const file of pending) {
      await applyMigration(sql, file)
    }

    console.log(`\nDone — ${pending.length} migration(s) applied.`)
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
