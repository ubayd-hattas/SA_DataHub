/**
 * The expected change in next month's fuel prices, read from
 * src/data/fuel/estimate.json (written by scripts/fuel/estimate.py).
 *
 * The file holds { status: 'none' } until the Central Energy Fund agrees to
 * its daily figures being shown. tests/unit/fuel-estimate.test.ts enforces
 * that, so publishing is a deliberate change.
 */
import file from '@/data/fuel/estimate.json'
import known from '@/data/fuel/known-changes.json'
import type { FuelProduct } from '@/lib/fuel'
import { breakdownHistory } from '@/lib/fuel-breakdown'

export const FUEL_NEXT_MONTH_PATH = '/fuel/next-month'

export interface EstimateRange {
  /** Cents per litre; negative is a cut. */
  low: number
  mid: number
  high: number
  knownCents: number
  pastMonths: number
}

export type FuelEstimate =
  | { status: 'none'; reason: string }
  | { status: 'too-early'; asOf: string; workingDays: number; targetMonth: string }
  | {
      status: 'ok'
      asOf: string
      workingDays: number
      targetMonth: string
      group: string
      products: Partial<Record<FuelProduct, EstimateRange>>
    }

export function fuelEstimate(): FuelEstimate {
  return file as unknown as FuelEstimate
}

export interface KnownChange {
  month: string
  what: string
  cents: Partial<Record<FuelProduct, number>>
  source: string
  url: string
}

export const KNOWN_CHANGES = known.changes as KnownChange[]
export const UNCONFIRMED_CHANGES = known._meta.unconfirmed

/**
 * The largest month-to-month move in the slate levy in the DMPR breakdown
 * tables SA Data Hub holds, in cents. The slate levy is not announced ahead,
 * so no estimate can include it; this says how large it has been.
 */
export function largestSlateMove(): { cents: number; month: string } | null {
  const history = breakdownHistory('petrol95')
  let best: { cents: number; month: string } | null = null
  for (let i = 1; i < history.length; i++) {
    const slate = (b: (typeof history)[number]) => b.elements.find((e) => e.id === 'slateLevy')?.cents ?? 0
    const move = Math.abs(slate(history[i]) - slate(history[i - 1]))
    if (!best || move > best.cents) best = { cents: Math.round(move * 100) / 100, month: history[i].month }
  }
  return best
}

/** "a cut of between R2.10 and R2.50", "a rise of between 12 and 40 cents", or a range across zero. */
export function describeRange(r: Pick<EstimateRange, 'low' | 'high'>): string {
  const amount = (c: number) => {
    const size = Math.abs(Math.round(c))
    return size < 100 ? `${size} cents` : `R${(size / 100).toFixed(2)}`
  }
  if (r.high < 0) return `a cut of between ${amount(r.high)} and ${amount(r.low)}`
  if (r.low > 0) return `a rise of between ${amount(r.low)} and ${amount(r.high)}`
  return `somewhere between a cut of ${amount(r.low)} and a rise of ${amount(r.high)}`
}
