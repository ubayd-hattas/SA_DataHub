import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cn } from '@/lib/utils'
import { formatCount, formatDecimal, formatPercent, formatPoints, formatRand, formatSigned } from '@/lib/format'

const NBSP = ' '

describe('number format', () => {
  it('uses one decimal and a decimal point', () => {
    expect(formatDecimal(4.5)).toBe('4.5')
    expect(formatDecimal(4)).toBe('4.0')
    expect(formatPercent(4.46)).toBe('4.5%')
  })
  it('groups thousands with a non-breaking space', () => {
    expect(formatCount(1234567)).toBe(`1${NBSP}234${NBSP}567`)
    expect(formatDecimal(12345.67)).toBe(`12${NBSP}345.7`)
  })
  it('keeps the sign on negatives but not on negative zero', () => {
    expect(formatDecimal(-0.4)).toBe('-0.4')
    expect(formatDecimal(-0.01)).toBe('0.0')
  })
  it('writes points and signed changes', () => {
    expect(formatPoints(1)).toBe('1.0 point')
    expect(formatPoints(1.5)).toBe('1.5 points')
    expect(formatSigned(0.4)).toBe('+0.4')
    expect(formatSigned(0)).toBe('0.0')
  })
  it('keeps cents on rand amounts', () => {
    expect(formatRand(1045.45)).toBe(`R1${NBSP}045.45`)
    expect(formatRand(100, 0)).toBe('R100')
  })
})

describe('cn()', () => {
  it('keeps a type-scale size next to a text colour', () => {
    expect(cn('text-caption text-muted')).toBe('text-caption text-muted')
    expect(cn('text-caption', 'text-small')).toBe('text-small')
  })
})

/** WCAG 2.x contrast ratio between two hex colours. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Read the theme variables out of globals.css so the CSS stays the single source. */
function readTheme(selector: ':root' | '.dark'): Record<string, string> {
  const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
  const start = css.indexOf(`${selector} {`)
  const block = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries([...block.matchAll(/--([a-z]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]))
}

describe.each([':root', '.dark'] as const)('colour tokens in %s meet WCAG AA', (selector) => {
  const t = readTheme(selector)
  it.each(['ink', 'muted', 'accent', 'good', 'bad'])('%s text on paper and on subtle is at least 4.5:1', (name) => {
    expect(t[name], `${name} is defined`).toBeTruthy()
    expect(contrast(t[name], t.paper)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t[name], t.subtle)).toBeGreaterThanOrEqual(4.5)
  })
  it('the rule colour is a quiet divider, not text', () => {
    expect(contrast(t.rule, t.paper)).toBeLessThan(2)
  })
})
