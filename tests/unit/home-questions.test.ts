/**
 * tests/unit/home-questions.test.ts
 */
import { describe, it, expect } from 'vitest'
import { homeQuestions } from '@/lib/home-questions'
import { getHeadlineNumbers } from '@/lib/headline-numbers'

describe('homepage questions', () => {
  const headline = getHeadlineNumbers()
  const rows = homeQuestions(headline)

  it('start with fuel and give six questions', () => {
    expect(rows).toHaveLength(6)
    expect(rows[0]).toMatchObject({ question: 'What does petrol cost this month?', href: '/fuel' })
  })

  it('show the same numbers as the headline tiles', () => {
    const tile = (id: string) => headline.find((n) => n.statId === id)!.value
    expect(rows[0].value).toBe(tile('fuel-petrol-95-inland'))
    expect(rows.find((r) => r.href.endsWith('/what-is-the-unemployment-rate-in-south-africa'))?.value).toBe(tile('unemployment-national'))
    expect(rows.find((r) => r.href.endsWith('/what-is-the-inflation-rate-in-south-africa'))?.value).toBe(tile('cpi-headline'))
  })

  it('give a period and source wherever a number is shown, and every question ends with a question mark', () => {
    for (const r of rows) {
      expect(r.question.endsWith('?')).toBe(true)
      if (r.value) expect(r.detail).toMatch(/\d{4}/)
    }
  })
})
