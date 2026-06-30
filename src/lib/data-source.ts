import { isDatabaseConfigured } from '@/lib/db/client'

export type DataSourceMode = 'json' | 'database'

export function getDataSourceMode(): DataSourceMode {
  return process.env.DATA_SOURCE === 'database' ? 'database' : 'json'
}

export function assertDatabaseModeReady(): void {
  if (getDataSourceMode() !== 'database') return
  if (!isDatabaseConfigured()) {
    throw new Error('DATA_SOURCE=database requires DATABASE_URL to be configured')
  }
}
