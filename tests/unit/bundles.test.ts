/**
 * Browser code must not import the dataset files (and their internal notes).
 * Client components get what they need as props from server components.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { toSearchRegistry } from '@/lib/search-intent'
import { datasetRegistry } from '@/lib/registry'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) ? [p] : []
  })
}

const isClient = (src: string) => /^['"]use client['"]/.test(src.trimStart())

/** A runtime import of the data: mock, the provider utils, a dataset JSON, or the registry (not type-only). */
function importsData(src: string): boolean {
  return src.split('\n').some((line) => {
    if (!line.startsWith('import ') || line.startsWith('import type')) return false
    return line.includes("'@/data/mock'") || line.includes("'@/data/providers/utils'") || line.includes('datasets/') || line.includes("'@/lib/registry'")
  })
}

describe('client bundles', () => {
  it('no client component imports the data at runtime (except the provinces page, rewritten in #23)', () => {
    const offenders = files(join(process.cwd(), 'src'))
      .filter((f) => {
        const src = readFileSync(f, 'utf8')
        return isClient(src) && importsData(src)
      })
      .map((f) => f.replace(process.cwd(), '').replace(/\\/g, '/'))
    // ProvincesExplorer stops being a client component when #23 merges.
    expect(offenders.filter((f) => f !== '/src/app/provinces/ProvincesExplorer.tsx')).toEqual([])
  })

  it('passes the dashboard only the registry fields search reads', () => {
    const trimmed = toSearchRegistry(datasetRegistry)
    for (const e of trimmed) expect(Object.keys(e).sort()).toEqual(['categoryId', 'description', 'id', 'label', 'statIds', 'updateFrequency'])
    expect(JSON.stringify(trimmed)).not.toMatch(/public_notes|publicNotes|UNRESOLVED/)
  })
})
