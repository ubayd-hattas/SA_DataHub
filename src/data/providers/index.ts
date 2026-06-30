import type { AppDataProvider } from './types'
import { getDataSourceMode } from '@/lib/data-source'
import { createJsonAppDataProvider } from './json'
import { createDatabaseAppDataProvider } from './database'

export async function getAppDataProvider(): Promise<AppDataProvider> {
  return getDataSourceMode() === 'database'
    ? createDatabaseAppDataProvider()
    : createJsonAppDataProvider()
}

export type { AppDataProvider } from './types'
