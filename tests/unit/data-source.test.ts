/**
 * tests/unit/data-source.test.ts
 */
import { afterEach, describe, it, expect } from 'vitest'
import { getDataSourceMode } from '@/lib/data-source'

const original = process.env.DATA_SOURCE

afterEach(() => {
  if (original === undefined) delete process.env.DATA_SOURCE
  else process.env.DATA_SOURCE = original
})

describe('getDataSourceMode', () => {
  it('reads the JSON files when DATA_SOURCE is unset, empty or "json"', () => {
    delete process.env.DATA_SOURCE
    expect(getDataSourceMode()).toBe('json')
    process.env.DATA_SOURCE = ''
    expect(getDataSourceMode()).toBe('json')
    process.env.DATA_SOURCE = 'json'
    expect(getDataSourceMode()).toBe('json')
  })

  it('reads the database only for "database"', () => {
    process.env.DATA_SOURCE = 'database'
    expect(getDataSourceMode()).toBe('database')
  })

  it('fails on any other value, including the old "db" spelling', () => {
    process.env.DATA_SOURCE = 'db'
    expect(() => getDataSourceMode()).toThrow(/"json" or "database"/)
  })
})
