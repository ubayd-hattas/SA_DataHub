import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const envPath = join(ROOT, '.env.local')
if (!existsSync(envPath)) {
  console.error('No .env.local')
  process.exit(1)
}
const line = readFileSync(envPath, 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='))
let url = line?.split('=').slice(1).join('=').trim() ?? ''
if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
  url = url.slice(1, -1)
}

const sql = postgres(url, { ssl: 'require', prepare: false, max: 1 })
try {
  const tables = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `
  console.log('Tables:', tables.map((t) => t.tablename).join(', ') || '(none)')

  const migrations = await sql`SELECT version FROM schema_migrations ORDER BY version`.catch(() => [])
  console.log('Applied migrations:', migrations.map((m) => m.version).join(', ') || '(none)')

  const geo = await sql`
    SELECT level, COUNT(*)::int AS n FROM geographies GROUP BY level ORDER BY level
  `.catch(() => [])
  if (geo.length) console.log('Geographies:', geo)

  const ds = await sql`SELECT COUNT(*)::int AS n FROM datasets`.catch(() => null)
  if (ds) console.log('Datasets:', ds[0].n)

  const obs = await sql`SELECT COUNT(*)::int AS n FROM observations`.catch(() => null)
  if (obs) console.log('Observations:', obs[0].n)
} finally {
  await sql.end()
}
