import { isDatabaseConfigured } from '@/lib/db/client'

export type DataSourceMode = 'json' | 'database'

/**
 * Which store the pages read. Unset or "json" means the JSON files; "database"
 * means PostgreSQL. Any other value is a mistake (for example the old "db"
 * spelling) and fails loudly, so nobody believes the database is live when it
 * is not.
 */
export function getDataSourceMode(): DataSourceMode {
  const value = process.env.DATA_SOURCE
  if (value === undefined || value === '' || value === 'json') return 'json'
  if (value === 'database') return 'database'
  throw new Error(`DATA_SOURCE must be "json" or "database", not "${value}"`)
}

export function assertDatabaseModeReady(): void {
  if (getDataSourceMode() !== 'database') return
  if (!isDatabaseConfigured()) {
    throw new Error('DATA_SOURCE=database requires DATABASE_URL to be configured')
  }
}
