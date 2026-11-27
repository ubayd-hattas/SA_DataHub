import { describe, it, expect } from 'vitest'
import { getProvinceData, getStatById } from '@/data/mock'
import { provinceDescription, provinceTitle, unemploymentTopicMetadata } from '@/lib/page-seo'
import { formatDecimal } from '@/lib/format'
import { formatStatistic, latestPeriod } from '@/lib/stat-summary'

describe('province titles', () => {
  it('lead with the 2026 population and call it an estimate', () => {
    for (const p of getProvinceData()) {
      const millions = `${formatDecimal(p.population / 1_000_000, 2)} million`
      expect(provinceTitle(p), p.id).toBe(`${p.name} population 2026: ${millions} (estimate)`)
      expect(provinceDescription(p), p.id).toContain(`${p.name}: ${millions} people (2026 est.)`)
      expect(provinceDescription(p).length, p.id).toBeLessThanOrEqual(160)
    }
  })
})

describe('unemployment topic metadata', () => {
  const stat = getStatById('unemployment-national')!
  const { title, description } = unemploymentTopicMetadata(stat)

  it('puts the latest rate and its quarter in the title', () => {
    expect(title).toBe(`South Africa unemployment rate: ${formatStatistic(stat)} (${latestPeriod(stat)})`)
  })

  it('keeps the description short, whole and sourced', () => {
    expect(description.length).toBeLessThanOrEqual(160)
    expect(description.endsWith('.')).toBe(true)
    expect(description).toContain(formatStatistic(stat))
  })
})
