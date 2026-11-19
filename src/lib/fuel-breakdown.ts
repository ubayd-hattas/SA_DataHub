/**
 * What a litre is made of, from src/data/fuel/breakdown.json (built by
 * scripts/fuel/build_breakdown.py from the DMPR's monthly margins tables).
 *
 * Covers petrol 95 and both diesels, inland (Gauteng), for the months the
 * DMPR tables list. Elements are in cents per litre, exactly as printed, and
 * add up to the official price to within half a cent.
 */
import file from '@/data/fuel/breakdown.json'
import type { FuelProduct, FuelZone } from '@/lib/fuel'

export type BreakdownGroupId = 'import' | 'taxes' | 'margins' | 'transport'

export interface BreakdownElement {
  id: string
  label: string
  group: BreakdownGroupId
  cents: number
}

interface BreakdownFile {
  _meta: {
    document: string
    url: string
    released_on: string
    checked_on: string
    covers: string
    dmpr_label: string
    excluded: { month: string; product: FuelProduct; reason: string }[]
  }
  months: { month: string; products: Partial<Record<FuelProduct, { total: number; elements: BreakdownElement[] }>> }[]
}

const data = file as unknown as BreakdownFile

export const BREAKDOWN_META = data._meta

export const BREAKDOWN_PRODUCTS: FuelProduct[] = ['petrol95', 'diesel500ppm', 'diesel50ppm']

export const BREAKDOWN_GROUPS: { id: BreakdownGroupId; label: string; detail: string }[] = [
  { id: 'import', label: 'Import cost', detail: 'The basic fuel price: what the fuel would cost to buy overseas and ship to South Africa. It follows international fuel prices and the rand-dollar exchange rate.' },
  { id: 'taxes', label: 'Taxes and levies', detail: 'The general fuel levy, the Road Accident Fund levy, the slate levy and smaller levies.' },
  { id: 'margins', label: 'Margins', detail: 'Amounts for the wholesaler, storage and distribution, and for petrol the filling station.' },
  { id: 'transport', label: 'Transport', detail: 'Getting the fuel from the coast to Gauteng, and delivery.' },
]

export interface BreakdownGroup {
  id: BreakdownGroupId
  label: string
  detail: string
  cents: number
  /** Share of the total, 0 to 1. */
  share: number
}

export interface Breakdown {
  month: string
  product: FuelProduct
  total: number
  elements: BreakdownElement[]
  groups: BreakdownGroup[]
}

export function hasBreakdown(product: FuelProduct, zone: FuelZone): boolean {
  return zone === 'inland' && BREAKDOWN_PRODUCTS.includes(product)
}

function build(month: string, product: FuelProduct): Breakdown | null {
  const entry = data.months.find((m) => m.month === month)?.products[product]
  if (!entry) return null
  const groups = BREAKDOWN_GROUPS.map((g) => {
    const cents = Math.round(entry.elements.filter((e) => e.group === g.id).reduce((n, e) => n + e.cents, 0) * 1000) / 1000
    return { ...g, cents, share: cents / entry.total }
  })
  return { month, product, total: entry.total, elements: entry.elements, groups }
}

/** The breakdown for one product: the given month, or the latest month that has one. */
export function breakdownFor(product: FuelProduct, month?: string): Breakdown | null {
  if (month) return build(month, product)
  const latest = [...data.months].reverse().find((m) => m.products[product])
  return latest ? build(latest.month, product) : null
}

/** Every month with a breakdown for this product, oldest first. */
export function breakdownHistory(product: FuelProduct): Breakdown[] {
  return data.months.map((m) => build(m.month, product)).filter((b): b is Breakdown => b !== null)
}

/** Months left out for this product, with the reason. */
export function breakdownExclusions(product: FuelProduct): { month: string; reason: string }[] {
  return data._meta.excluded.filter((e) => e.product === product).map(({ month, reason }) => ({ month, reason }))
}

/**
 * Temporary changes the DMPR announced, shown beside the month they apply to.
 * Each has its source. Add one only from the official statement.
 */
export const BREAKDOWN_NOTES: Record<string, { text: string; source: string; url: string }> = {
  '2026-11': {
    text: 'From 4 November 2026 the general fuel levy was cut for a limited time by R1.50 a litre on petrol and R3.00 on diesel, which took it to 279.0 cents on petrol and 116.0 cents on diesel. The cut was announced in the Medium-Term Budget Policy Statement on 21 October 2026.',
    source: 'Minister Gwede Mantashe announces adjustment of fuel prices effective from 4 November 2026, 3 November 2026',
    url: 'https://www.gov.za/news/media-statements/minister-gwede-mantashe-announces-adjustment-fuel-prices-effective-4-0',
  },
}
