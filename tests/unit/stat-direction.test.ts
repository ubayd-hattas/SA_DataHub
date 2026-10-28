/**
 * tests/unit/stat-direction.test.ts
 *
 * Whether a rise or fall is good news is declared for every statistic, with
 * no category fallback. Uses real statistics from the JSON datasets.
 */

import { describe, it, expect } from 'vitest'
import type { Statistic } from '@/types'
import { formatChange, getGoodDirection, judgeMove, GOOD_DIRECTION_BY_STAT } from '@/lib/utils'
import { generateInsight, generateEnrichedInsight } from '@/lib/insights'
import { generateExplanation } from '@/lib/explanations'
import { allStatistics, getStatById, statistics } from '@/data/mock'

function stat(id: string): Statistic {
  const s = getStatById(id)
  if (!s) throw new Error(`missing stat ${id}`)
  return s
}

describe('getGoodDirection', () => {
  it('every statistic declares up, down or neutral', () => {
    const missing = statistics.filter((s) => !(s.id in GOOD_DIRECTION_BY_STAT)).map((s) => s.id)
    expect(missing).toEqual([])
    for (const s of statistics) {
      expect(['up', 'down', 'neutral'], s.id).toContain(GOOD_DIRECTION_BY_STAT[s.id])
    }
  })

  it('every entry refers to a record that exists (shown or withheld)', () => {
    for (const id of Object.keys(GOOD_DIRECTION_BY_STAT)) {
      expect(allStatistics.find((s) => s.id === id), id).toBeDefined()
    }
  })

  it('treats a rise in labour force participation as good, despite the unemployment category', () => {
    expect(getGoodDirection(stat('lfpr-overall'))).toBe('up')
    expect(getGoodDirection(stat('female-labour-participation'))).toBe('up')
    expect(judgeMove(stat('female-labour-participation'), 'up')).toBe('positive')
  })

  it('does not show the untraced no-income share', () => {
    expect(statistics.find((s) => s.id === 'census-no-income')).toBeUndefined()
  })

  it('gives policy and lending rates no good or bad verdict', () => {
    for (const id of ['repo-rate-sarb', 'prime-lending-rate']) {
      expect(judgeMove(stat(id), 'up'), id).toBe('neutral')
      expect(judgeMove(stat(id), 'down'), id).toBe('neutral')
    }
  })

  it('treats population statistics and nominal GDP (total and per person) as neutral', () => {
    const ids = [...statistics.filter((s) => s.categoryId === 'population').map((s) => s.id), 'gdp-nominal', 'gdp-per-capita']
    expect(ids.length).toBeGreaterThan(1)
    for (const id of ids) {
      expect(getGoodDirection(stat(id)), id).toBe('neutral')
      expect(judgeMove(stat(id), 'up'), id).toBe('neutral')
    }
  })

  it('judges other statistics by their declared direction', () => {
    expect(judgeMove(stat('unemployment-national'), 'up')).toBe('negative')
    expect(judgeMove(stat('murder-rate'), 'down')).toBe('positive')
    expect(judgeMove(stat('matric-pass-rate'), 'up')).toBe('positive')
    expect(judgeMove(stat('cpi-headline'), 'up')).toBe('negative')
  })

  it('treats a stable trend as neutral', () => {
    expect(judgeMove(stat('unemployment-national'), 'stable')).toBe('neutral')
  })
})

describe('badges and insight text follow the per-statistic direction', () => {
  it('keeps a single repo-rate record', () => {
    expect(statistics.filter((s) => /repo/i.test(s.id)).map((s) => s.id)).toEqual(['repo-rate-sarb'])
  })

  it('does not call a rise in female labour force participation a concern', () => {
    const s = stat('female-labour-participation')
    for (const insight of [generateInsight(s), generateEnrichedInsight(s)]) {
      expect(insight.summary).not.toContain('a concern')
    }
    const explanation = generateExplanation(s)
    expect(`${explanation.whatChanged} ${explanation.longTermTrend}`).not.toContain('deterioration')
  })

  it('gives no verdict wording for the repo rate', () => {
    const s = stat('repo-rate-sarb')
    const text = [generateInsight(s).summary, generateExplanation(s).whatChanged].join(' ')
    for (const word of ['a concern', 'positive development', 'deterioration', 'setback', 'improvement']) {
      expect(text, word).not.toContain(word)
    }
  })
})

describe('change wording uses the series unit', () => {
  it('writes population changes in millions, with a space', () => {
    const s = stat('population-total')
    const text = [generateInsight(s).summary, generateExplanation(s).whatChanged, generateExplanation(s).longTermTrend].join(' ')
    expect(text).toMatch(/by \d+\.\d million/)
    expect(text).not.toMatch(/\dpeople/)
    expect(text).not.toMatch(/by \d+\.\d people/)
  })

  it('keeps percentage-point wording for rates', () => {
    expect(formatChange(stat('unemployment-national'), 0.4)).toBe('0.4pp')
    expect(formatChange(stat('unemployment-national'), 0.4, true)).toBe('0.4 percentage points')
  })
})
