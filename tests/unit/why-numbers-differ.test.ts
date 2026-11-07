import { describe, expect, it } from 'vitest'
import { metadata } from '@/app/why-numbers-differ/page'
import { UN_WPP_2026 } from '@/data/population-comparison'
import { qlfs2026q2 } from '@/data/explainers/qlfs-2026-q2'
import { getStatById } from '@/data/mock'
import { getChangeMeasure } from '@/lib/census-change'

const millions = (n: number) => (n / 1e6).toFixed(1)

describe('why numbers differ', () => {
  const census = getChangeMeasure('population')!.national.value2022
  const mye = getStatById('population-total')!.rawValue as number
  const description = String(metadata.description)

  it('quotes the current population figures in its search description', () => {
    for (const n of [census, mye, UN_WPP_2026.value]) expect(description).toContain(`${millions(n)} million`)
  })

  it('quotes the current official and LU3 rates in its search description', () => {
    const lu1 = qlfs2026q2.rates.find((r) => r.code === 'LU1')!.current.value
    const lu3 = qlfs2026q2.rates.find((r) => r.code === 'LU3')!.current.value
    expect(description).toContain(`${lu1.toFixed(1)}%`)
    expect(description).toContain(`${lu3.toFixed(1)}%`)
  })

  it('orders the four labour measures from narrowest to widest', () => {
    const v = qlfs2026q2.rates.map((r) => r.current.value)
    expect(qlfs2026q2.rates.map((r) => r.code)).toEqual(['LU1', 'LU2', 'LU3', 'LU4'])
    expect(v[0]).toBeLessThan(v[1])
    expect(v[0]).toBeLessThan(v[2])
    expect(v[3]).toBeGreaterThanOrEqual(Math.max(v[1], v[2]))
  })

  it('records the UN figure with its date, source and check date', () => {
    expect(UN_WPP_2026.asOf).toBe('2026-07-01')
    expect(UN_WPP_2026.url).toMatch(/^https:\/\/data\.un\.org\//)
    expect(UN_WPP_2026.checkedOn >= UN_WPP_2026.releasedOn).toBe(true)
  })
})
