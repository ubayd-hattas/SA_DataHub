/**
 * "What it costs me": litres × the official price per litre for a product,
 * zone and month, rounded to the cent, and the difference from the month
 * before at the same litres. Pure functions, so the page, the form and the
 * share image all give the same answer.
 *
 * Prices are cents per litre as the DMPR printed them, and some (wholesale
 * diesel and paraffin) carry fractions of a cent. The total uses the exact
 * price and is rounded once, half up, at the end.
 */
import {
  FUEL_PRODUCTS,
  FUEL_ZONES,
  fuelAdjustments,
  latestAdjustment,
  type FuelProduct,
  type FuelZone,
} from '@/lib/fuel'

export const MIN_LITRES = 1
export const MAX_LITRES = 1000
export const DEFAULT_LITRES = 45

export interface FuelCostInput {
  litres: number
  product: FuelProduct
  zone: FuelZone
  /** YYYY-MM. The latest month in the data when left out. */
  month?: string
}

export type FuelCostErrors = Partial<Record<'litres' | 'product' | 'zone' | 'month', string>>

export interface FuelCostComparison {
  /** YYYY-MM of the month before. */
  month: string
  priceCents: number
  costCents: number
  /** This month's cost minus the month before's, in cents. Negative when it got cheaper. */
  differenceCents: number
}

export type FuelCostResult =
  | {
      ok: true
      litres: number
      product: FuelProduct
      zone: FuelZone
      month: string
      priceCents: number
      costCents: number
      /** null for the first month, or when the month before has no price. */
      previous: FuelCostComparison | null
    }
  | { ok: false; errors: FuelCostErrors }

export const LITRES_ERROR = `Enter litres as a number from ${MIN_LITRES} to ${MAX_LITRES}, for example 45 or 52.5.`

/**
 * Litres from text: digits with an optional full stop and up to two decimals.
 * Spaces are ignored ("1 000"). The range is checked by calculateFuelCost.
 */
export function parseLitres(text: string): number | null {
  const cleaned = text.replace(/\s/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Number(cleaned)
}

/** litres × cents, rounded once. Litres have at most two decimals, so the scaling keeps the sum exact. */
export function costCents(litres: number, priceCents: number): number {
  const hundredthsOfLitres = Math.round(litres * 100)
  const hundredthsOfCents = Math.round(priceCents * 100)
  return Math.round((hundredthsOfLitres * hundredthsOfCents) / 10000)
}

/** "R30.24", or "R31.6007" where the price has a fraction of a cent, so the working adds up. */
export function priceText(priceCents: number): string {
  const rands = priceCents / 100
  const text = Number.isInteger(priceCents) ? rands.toFixed(2) : rands.toFixed(4).replace(/0+$/, '')
  return `R${text}`
}

export function calculateFuelCost(input: FuelCostInput): FuelCostResult {
  const errors: FuelCostErrors = {}
  const { litres, product, zone } = input
  const month = input.month ?? latestAdjustment().month

  if (typeof litres !== 'number' || !Number.isFinite(litres) || litres < MIN_LITRES || litres > MAX_LITRES) {
    errors.litres = LITRES_ERROR
  }
  if (!FUEL_PRODUCTS.some((p) => p.id === product)) errors.product = 'Choose one of the fuels in the list.'
  if (!FUEL_ZONES.some((z) => z.id === zone)) errors.zone = 'Choose inland or coastal.'

  const adjustments = fuelAdjustments()
  const index = adjustments.findIndex((a) => a.month === month)
  if (index === -1) errors.month = 'There is no price for that month.'

  if (Object.keys(errors).length) return { ok: false, errors }

  const priceCents = adjustments[index].prices[product][zone]
  if (priceCents === null) {
    return { ok: false, errors: { month: 'No price is held for that product and zone in that month.' } }
  }

  const cost = costCents(litres, priceCents)
  const before = index > 0 ? adjustments[index - 1] : undefined
  const beforePrice = before?.prices[product][zone] ?? null
  let previous: FuelCostComparison | null = null
  if (before && beforePrice !== null) {
    const beforeCost = costCents(litres, beforePrice)
    previous = { month: before.month, priceCents: beforePrice, costCents: beforeCost, differenceCents: cost - beforeCost }
  }

  return { ok: true, litres, product, zone, month, priceCents, costCents: cost, previous }
}
