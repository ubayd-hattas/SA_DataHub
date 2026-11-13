/**
 * Official monthly fuel prices, from src/data/fuel/prices.json.
 *
 * The file holds one record per monthly adjustment in cents per litre, exactly
 * as the Department of Mineral and Petroleum Resources (DMPR) printed them. It
 * is built by scripts/fuel/build_prices.py. This module turns it into the
 * site's Statistic records (one per product and zone), so series pages, CSV
 * and JSON downloads, embeds, search and the sourcing check all work for fuel
 * with no fuel-specific export code.
 */
import pricesFile from '@/data/fuel/prices.json'
import type { Statistic } from '@/types'

export type FuelProduct = 'petrol93' | 'petrol95' | 'diesel500ppm' | 'diesel50ppm' | 'paraffin'
export type FuelZone = 'inland' | 'coastal'

export interface FuelAdjustment {
  /** YYYY-MM, the month the price applies to. */
  month: string
  /** ISO date the price took effect. */
  effectiveFrom: string
  /** ISO date the DMPR published it, where a held document states it. */
  releasedOn?: string
  source: { document: string; url: string }
  enteredFrom: 'spreadsheet' | 'hand'
  note?: string
  /** Cents per litre. null when no held DMPR file gives the price. */
  prices: Record<FuelProduct, Record<FuelZone, number | null>>
}

interface FuelFile {
  _meta: { checked_on: string; publisher: string; publisher_url: string; terms: string }
  adjustments: FuelAdjustment[]
}

const file = pricesFile as unknown as FuelFile

export const FUEL_PUBLISHER = {
  name: 'Department of Mineral and Petroleum Resources',
  shortName: 'DMPR',
  url: 'https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices',
}

export const FUEL_TERMS = file._meta.terms

export interface FuelProductInfo {
  id: FuelProduct
  slug: string
  /** "Petrol 95" */
  label: string
  /** What the pump or the official notice calls it. */
  officialName: string
  priceType: 'retail' | 'wholesale'
}

export const FUEL_PRODUCTS: FuelProductInfo[] = [
  { id: 'petrol95', slug: 'petrol-95', label: 'Petrol 95', officialName: '95 unleaded', priceType: 'retail' },
  { id: 'petrol93', slug: 'petrol-93', label: 'Petrol 93', officialName: '93 unleaded', priceType: 'retail' },
  { id: 'diesel500ppm', slug: 'diesel-500ppm', label: 'Diesel 500 ppm', officialName: 'diesel 0.05% sulphur', priceType: 'wholesale' },
  { id: 'diesel50ppm', slug: 'diesel-50ppm', label: 'Diesel 50 ppm', officialName: 'diesel 0.005% sulphur', priceType: 'wholesale' },
  { id: 'paraffin', slug: 'paraffin', label: 'Illuminating paraffin', officialName: 'illuminating paraffin', priceType: 'wholesale' },
]

export const FUEL_ZONES: { id: FuelZone; label: string; detail: string }[] = [
  { id: 'inland', label: 'Inland', detail: 'Gauteng (zone 9C), the inland reference price' },
  { id: 'coastal', label: 'Coastal', detail: 'Zone 1A, the coastal reference price' },
]

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-11" to "Nov 2026", the period label every other monthly series uses. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

/** Every adjustment, oldest first. */
export function fuelAdjustments(): FuelAdjustment[] {
  return [...file.adjustments].sort((a, b) => a.month.localeCompare(b.month))
}

export function latestAdjustment(): FuelAdjustment {
  const all = fuelAdjustments()
  const last = all.at(-1)
  if (!last) throw new Error('Fuel: prices.json has no adjustments')
  return last
}

export function fuelSeriesId(product: FuelProduct, zone: FuelZone): string {
  const info = FUEL_PRODUCTS.find((p) => p.id === product)
  if (!info) throw new Error(`Fuel: unknown product ${product}`)
  return `fuel-${info.slug}-${zone}`
}

/** Cents per litre to rands per litre, exactly (no rounding). */
export const centsToRands = (cents: number) => Math.round(cents * 1000) / 100000

/** R30.24: whole cents, the way prices are shown at the pump. */
export function formatRandsPerLitre(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`
}

/** "up 12 cents", "down R1.10", "no change": a change in cents per litre, in words. */
export function describeChange(cents: number): string {
  const rounded = Math.round(cents)
  if (rounded === 0) return 'no change'
  const size = Math.abs(rounded)
  const amount = size < 100 ? `${size} cent${size === 1 ? '' : 's'}` : `R${(size / 100).toFixed(2)}`
  return `${rounded > 0 ? 'up' : 'down'} ${amount}`
}

/** The points of one product and zone, oldest first, skipping months with no price. */
export function fuelPoints(product: FuelProduct, zone: FuelZone): { month: string; cents: number }[] {
  return fuelAdjustments()
    .map((a) => ({ month: a.month, cents: a.prices[product][zone] }))
    .filter((p): p is { month: string; cents: number } => p.cents !== null)
}

function missingMonths(product: FuelProduct, zone: FuelZone): string[] {
  return fuelAdjustments()
    .filter((a) => a.prices[product][zone] === null)
    .map((a) => monthLabel(a.month))
}

function statisticFor(info: FuelProductInfo, zone: FuelZone): Statistic {
  const points = fuelPoints(info.id, zone)
  const latest = latestAdjustment()
  const last = points.at(-1)
  const previous = points.at(-2)
  if (!last || last.month !== latest.month) {
    throw new Error(`Fuel: ${info.id} ${zone} has no price for the latest month, ${latest.month}`)
  }
  if (!latest.releasedOn) throw new Error(`Fuel: ${latest.month} has no release date`)
  const changeCents = previous ? last.cents - previous.cents : 0
  const zoneInfo = FUEL_ZONES.find((z) => z.id === zone)!
  const missing = missingMonths(info.id, zone)
  const notes = [
    info.priceType === 'wholesale'
      ? `This is the official wholesale price. Filling stations set their own pump price for ${info.officialName}, so the price you pay will differ.`
      : null,
    missing.length ? `No DMPR file SA Data Hub holds gives this price for ${missing.join(' and ')}, so ${missing.length === 1 ? 'that month is' : 'those months are'} left out.` : null,
  ].filter(Boolean)

  return {
    id: fuelSeriesId(info.id, zone),
    categoryId: 'fuel',
    title: `${info.label} ${info.priceType === 'wholesale' ? 'wholesale price' : 'price'}, ${zoneInfo.label.toLowerCase()}`,
    value: formatRandsPerLitre(last.cents),
    rawValue: centsToRands(last.cents),
    unit: 'R/litre',
    change: centsToRands(changeCents),
    changeLabel: previous ? `${describeChange(changeCents)} from ${monthLabel(previous.month)}` : 'first month in the series',
    trend: changeCents > 0 ? 'up' : changeCents < 0 ? 'down' : 'stable',
    description: `The official ${info.priceType === 'wholesale' ? 'wholesale ' : ''}price of ${info.officialName} in rands per litre, ${zoneInfo.detail}, set by the DMPR each month.`,
    source: {
      ...FUEL_PUBLISHER,
      publicationName: latest.source.document,
      publicationDate: latest.releasedOn,
    },
    lastUpdated: latest.releasedOn,
    checkedOn: file._meta.checked_on,
    ...(notes.length ? { note: notes.join(' ') } : {}),
    series: [
      {
        name: `${info.label}, ${zoneInfo.label.toLowerCase()}`,
        unit: 'R/litre',
        data: points.map((p) => ({ label: monthLabel(p.month), value: centsToRands(p.cents) })),
      },
    ],
  }
}

/** One statistic per product and zone: ten series. */
export function fuelStatistics(): Statistic[] {
  return FUEL_PRODUCTS.flatMap((info) => FUEL_ZONES.map((z) => statisticFor(info, z.id)))
}
