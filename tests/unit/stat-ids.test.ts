/**
 * tests/unit/stat-ids.test.ts
 *
 * Statistic ids are page and download addresses (/series/<id>), so each must
 * be unique across every dataset file, including withheld records.
 */
import { describe, it, expect } from 'vitest'
import { allStatistics } from '@/data/mock'

describe('statistic ids', () => {
  it('are unique across every dataset', () => {
    const seen = new Map<string, number>()
    for (const s of allStatistics) seen.set(s.id, (seen.get(s.id) ?? 0) + 1)
    const repeated = [...seen].filter(([, n]) => n > 1).map(([id]) => id)
    expect(repeated).toEqual([])
  })
})
