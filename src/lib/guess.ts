import { formatCount, formatPercent, formatPoints } from '@/lib/format'

/** What the guessed number is: a percentage, or a count of people or places. */
export type GuessUnit = 'percent' | 'count'

export function formatGuess(value: number, unit: GuessUnit): string {
  return unit === 'percent' ? formatPercent(value) : formatCount(Math.round(value))
}

/** One plain sentence comparing a guess with the published figure. */
export function guessFeedback(guess: number, actual: number, unit: GuessUnit): string {
  const gap = guess - actual
  if (Math.abs(gap) < 1e-9) return 'Your guess was exactly right.'
  const size = unit === 'percent' ? formatPoints(Math.abs(gap)) : formatCount(Math.round(Math.abs(gap)))
  return `Your guess of ${formatGuess(guess, unit)} was ${size} too ${gap > 0 ? 'high' : 'low'}.`
}
