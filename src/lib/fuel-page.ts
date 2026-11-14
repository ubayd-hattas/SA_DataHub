/**
 * What the /fuel page shows for one product and zone: the headline price, the
 * change from the month before, and the statistic behind it. Kept apart from
 * the page so the wording can be tested without rendering.
 */
import type { Statistic } from '@/types'
import {
  FUEL_PRODUCTS,
  FUEL_ZONES,
  describeChange,
  formatRandsPerLitre,
  fuelPoints,
  fuelSeriesId,
  fuelStatistics,
  latestAdjustment,
  monthLabel,
  type FuelProduct,
  type FuelProductInfo,
  type FuelZone,
} from '@/lib/fuel'

export const FUEL_PATH = '/fuel'
export const DEFAULT_PRODUCT: FuelProduct = 'petrol95'
export const DEFAULT_ZONE: FuelZone = 'inland'

const LONG_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** "2026-11" to "November 2026". */
export function longMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${LONG_MONTHS[m - 1]} ${y}`
}

/** The page title and heading, built from the latest month in the data. */
export function fuelPageTitle(): string {
  return `Petrol and diesel prices in South Africa, ${longMonthLabel(latestAdjustment().month)}`
}

export function productInfo(product: FuelProduct): FuelProductInfo {
  return FUEL_PRODUCTS.find((p) => p.id === product)!
}

export function zoneLabel(zone: FuelZone): string {
  return FUEL_ZONES.find((z) => z.id === zone)!.label
}

/** "Diesel 50 ppm (wholesale)": the product name, with the price type where it is not a pump price. */
export function productName(product: FuelProduct): string {
  const info = productInfo(product)
  return info.priceType === 'wholesale' ? `${info.label} (wholesale)` : info.label
}

export interface FuelHeadline {
  stat: Statistic
  product: FuelProductInfo
  zone: FuelZone
  /** "R30.24" */
  price: string
  /** The month label, "Nov 2026". */
  month: string
  /** ISO date the price took effect. */
  effectiveFrom: string
  /** "Down 1 cent from R30.25 in Oct 2026", or a plain statement for the first month. */
  change: string
}

export function fuelHeadline(product: FuelProduct, zone: FuelZone): FuelHeadline {
  const id = fuelSeriesId(product, zone)
  const stat = fuelStatistics().find((s) => s.id === id)!
  const latest = latestAdjustment()
  const points = fuelPoints(product, zone)
  const last = points.at(-1)!
  const previous = points.at(-2)
  let change = 'This is the first month in the series.'
  if (previous) {
    const words = describeChange(last.cents - previous.cents)
    change = `${words.charAt(0).toUpperCase()}${words.slice(1)} from ${formatRandsPerLitre(previous.cents)} in ${monthLabel(previous.month)}.`
  }
  return {
    stat,
    product: productInfo(product),
    zone,
    price: formatRandsPerLitre(last.cents),
    month: monthLabel(last.month),
    effectiveFrom: latest.effectiveFrom,
    change,
  }
}

/** One row of the all-products table: the latest price in each zone, in cents. */
export interface FuelTableRow {
  product: FuelProductInfo
  inland: number | null
  coastal: number | null
}

export function latestPriceRows(): FuelTableRow[] {
  const latest = latestAdjustment()
  return FUEL_PRODUCTS.map((product) => ({
    product,
    inland: latest.prices[product.id].inland,
    coastal: latest.prices[product.id].coastal,
  }))
}

export interface FuelSelection {
  product: FuelProduct
  zone: FuelZone
}

type RawParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** Product and zone from the URL (`?product=diesel-50ppm&zone=coastal`). Anything unknown falls back to the default. */
export function parseFuelSelection(params: RawParams): FuelSelection {
  const product = FUEL_PRODUCTS.find((p) => p.slug === first(params.product))?.id ?? DEFAULT_PRODUCT
  const zone = FUEL_ZONES.find((z) => z.id === first(params.zone))?.id ?? DEFAULT_ZONE
  return { product, zone }
}

/** The address for a selection. The default is the bare `/fuel`. */
export function fuelHref({ product, zone }: FuelSelection): string {
  const query = new URLSearchParams()
  if (product !== DEFAULT_PRODUCT) query.set('product', productInfo(product).slug)
  if (zone !== DEFAULT_ZONE) query.set('zone', zone)
  const text = query.toString()
  return text ? `${FUEL_PATH}?${text}` : FUEL_PATH
}
