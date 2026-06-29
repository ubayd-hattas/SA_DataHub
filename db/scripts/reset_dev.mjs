/**
 * Drops and recreates the public schema — DEV BRANCH ONLY.
 * Usage: node db/scripts/reset_dev.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const envPath = join(ROOT, '.env.local')
if (!existsSync(envPath)) {
  console.error('No .env.local — set DATABASE_URL first.')
  process.exit(1)
}

let url = ''
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    url = line.slice('DATABASE_URL='.length).trim()
    if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
      url = url.slice(1, -1)
    }
    break
  }
}

if (!url) {
  console.error('DATABASE_URL not found in .env.local')
  process.exit(1)
}

console.warn('WARNING: This drops ALL tables in the public schema.')
console.warn('Only run against a Neon dev branch, never production.')

const sql = postgres(url, { ssl: 'require', prepare: false, max: 1 })
try {
  await sql.unsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  console.log('Public schema reset. Run: npm run db:migrate')
} finally {
  await sql.end()
}
