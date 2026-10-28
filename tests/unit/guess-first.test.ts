/**
 * "Guess first": the wording of the feedback, the accessible markup, that the
 * answer is not in the page before it is revealed, and the four pages that use it.
 */
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { formatGuess, guessFeedback } from '@/lib/guess'
import { GuessFirst } from '@/components/editorial/GuessFirst'
import { getAnswer } from '@/data/answers'
import { getAllMunicipalities, provinces } from '@/data/mock'

describe('guess feedback', () => {
  it('formats percentages and counts', () => {
    expect(formatGuess(43.8, 'percent')).toBe('43.8%')
    expect(formatGuess(1355000, 'count')).toBe('1 355 000')
  })

  it('says how far off the guess was, in points or in units', () => {
    expect(guessFeedback(40, 43.8, 'percent')).toBe('Your guess of 40.0% was 3.8 points too low.')
    expect(guessFeedback(5, 3.1, 'percent')).toBe('Your guess of 5.0% was 1.9 points too high.')
    expect(guessFeedback(50, 44, 'count')).toBe('Your guess of 50 was 6 too high.')
    expect(guessFeedback(44, 44, 'count')).toBe('Your guess was exactly right.')
  })
})

describe('GuessFirst', () => {
  const html = renderToStaticMarkup(
    createElement(GuessFirst, { question: 'Guess LU3.', min: 30, max: 60, step: 0.5, unit: 'percent', value: 43.8, source: 'Stats SA P0211 Q2 2026, Table A, page 1' }),
  )

  it('labels the slider with the question and offers reveal and skip buttons', () => {
    expect(html).toMatch(/<label for="([^"]+)-slider"[^>]*>Guess LU3\.<\/label>/)
    expect(html).toContain('type="range"')
    expect(html).toContain('aria-valuetext="45.0%"')
    expect(html).toContain('>Show the answer</button>')
    expect(html).toContain('>Skip</button>')
    // The buttons go once the answer shows, so the answer takes focus.
    expect(html).toContain('tabindex="-1"')
  })

  it('does not put the answer or its source in the page before it is revealed', () => {
    expect(html).not.toContain('43.8')
    expect(html).not.toContain('Table A, page 1')
  })
})

describe('where it is used', () => {
  it('is on at most four pages: two explainers and two answers', () => {
    const files = execSync('git grep -l "<GuessFirst" -- src', { encoding: 'utf8' }).trim().split('\n').sort()
    expect(files).toEqual([
      'src/app/answers/[slug]/page.tsx',
      'src/components/explainers/CpiExplainerView.tsx',
      'src/components/explainers/QlfsExplainerView.tsx',
    ])
    const answersWithGuess = ['how-many-municipalities-are-there-in-south-africa', 'which-province-has-the-most-people']
    for (const slug of answersWithGuess) expect(getAnswer(slug)?.guess).toBeDefined()
    const src = readFileSync(join(process.cwd(), 'src/data/answers.ts'), 'utf8')
    expect(src.match(/\n {6}guess: \{/g)).toHaveLength(2)
  })

  it('asks about a figure the page shows lower down, with the same value', () => {
    const kzn = getAnswer('how-many-municipalities-are-there-in-south-africa')!
    expect(kzn.guess!.value).toBe(getAllMunicipalities().filter((m) => m.provinceName === 'KwaZulu-Natal').length)
    expect(kzn.figure.rows.find((r) => r.label === 'KwaZulu-Natal')?.value).toBe(kzn.guess!.value)
    expect(kzn.answer).not.toContain(`${kzn.guess!.value} `)

    const nc = getAnswer('which-province-has-the-most-people')!
    expect(nc.guess!.value).toBe(provinces.find((p) => p.name === 'Northern Cape')!.population)
    expect(nc.figure.rows.find((r) => r.label === 'Northern Cape')?.value).toBe(nc.guess!.value)
    expect(nc.guess!.value).toBeGreaterThanOrEqual(nc.guess!.min)
    expect(nc.guess!.value).toBeLessThanOrEqual(nc.guess!.max)
  })
})
