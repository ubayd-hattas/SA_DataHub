/**
 * tests/unit/registry-automation.test.ts
 *
 * The Download Center tells readers how each dataset is updated. A dataset may
 * only claim to be updated automatically (or by script) when a running,
 * tested pipeline feeds it. Add its id here only in the pull request that
 * switches that pipeline on.
 */
import { describe, it, expect } from 'vitest'
import { datasetRegistry } from '@/lib/registry'

const AUTOMATED: string[] = []
// fuel: scripts/fuel/build_prices.py reads the DMPR spreadsheets the maintainer downloads.
const SCRIPTED: string[] = ['fuel']

describe('dataset automation labels', () => {
  it.each(datasetRegistry.map((e) => [e.id, e.automationLevel] as const))('%s says %s truthfully', (id, level) => {
    if (level === 'auto') expect(AUTOMATED).toContain(id)
    if (level === 'semi-auto') expect(SCRIPTED).toContain(id)
  })
})
