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
import { formatDecimal } from '@/lib/format'
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

export const LITRES_ERROR = `Enter litres as a number from ${MIN_LITRES} to ${MAX_LITRES}, for example 45 or 52,5.`

/**
 * Litres from text: digits with an optional decimal part of up to two digits,
 * written with a full stop or a comma ("52.5" or "52,5"). Spaces are ignored
 * ("1 000"). A comma followed by three digits ("1,000") could be a thousands
 * separator or a decimal, so it is rejected rather than guessed. The range is
 * checked by calculateFuelCost.
 */
export function parseLitres(text: string): number | null {
  const cleaned = text.replace(/\s/g, '').replace(/^(\d+),(\d{1,2})$/, '$1.$2')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Number(cleaned)
}

/**
 * litres × cents, rounded once to whole cents, half up. Litres have at most two
 * decimals and published prices at most three decimals of a cent (paraffin),
 * so both scale to whole numbers and the sum is exact: hundredths of a litre
 * × thousandths of a cent, divided by 100 000.
 */
export function costCents(litres: number, priceCents: number): number {
  const hundredthsOfLitres = Math.round(litres * 100)
  const thousandthsOfCents = Math.round(priceCents * 1000)
  return Math.floor((hundredthsOfLitres * thousandthsOfCents + 50000) / 100000)
}

/**
 * The published price, exactly: "R30.24" where it is whole cents, and
 * "3 160.07 cents" where it has a fraction of a cent (wholesale diesel,
 * paraffin), so the working adds up with no rounded price in it.
 */
export function priceText(priceCents: number): string {
  if (Number.isInteger(priceCents)) return `R${(priceCents / 100).toFixed(2)}`
  const decimals = Number.isInteger(priceCents * 10) ? 1 : Number.isInteger(priceCents * 100) ? 2 : 3
  return `${formatDecimal(priceCents, decimals)} cents`
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

export type ShareQuery =
  | { ok: true; litres: number; product: FuelProduct; zone: FuelZone }
  | { ok: false; error: string }

/**
 * Inputs for the share image, from the query string. Product and zone must
 * be on the fixed lists (an unknown one is an error, not a default, so the
 * route cannot be asked for endless variants). Litres go through parseLitres
 * and the same range as the page, and anything the page would call an error
 * is an error here too (no clamping). Left out means the default.
 */
export function parseShareQuery(params: Record<string, string | undefined>): ShareQuery {
  let product: FuelProduct = 'petrol95'
  if (params.product !== undefined) {
    const found = FUEL_PRODUCTS.find((p) => p.slug === params.product)
    if (!found) return { ok: false, error: 'Unknown product.' }
    product = found.id
  }

  let zone: FuelZone = 'inland'
  if (params.zone !== undefined) {
    const found = FUEL_ZONES.find((z) => z.id === params.zone)
    if (!found) return { ok: false, error: 'Unknown zone.' }
    zone = found.id
  }

  let litres = DEFAULT_LITRES
  if (params.litres !== undefined) {
    // The same reading and range check as the calculator on the page.
    const parsed = parseLitres(params.litres)
    if (parsed === null) return { ok: false, error: LITRES_ERROR }
    if (parsed < MIN_LITRES || parsed > MAX_LITRES) return { ok: false, error: LITRES_ERROR }
    litres = parsed
  }

  return { ok: true, litres, product, zone }
}
