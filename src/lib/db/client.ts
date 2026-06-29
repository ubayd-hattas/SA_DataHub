import postgres, { type Sql } from 'postgres'

let sql: Sql | null = null

/**
 * Returns true when DATABASE_URL is configured.
 * JSON mode builds and runs without a database connection.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

/**
 * Returns a singleton postgres.js client for Neon.
 * Throws if DATABASE_URL is missing — callers should check isDatabaseConfigured() first.
 */
export function getSql(): Sql {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured')
  }

  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      // Required when using Neon connection pooler (PgBouncer transaction mode).
      prepare: false,
      // Conservative pool size for serverless route handlers.
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  }

  return sql
}
