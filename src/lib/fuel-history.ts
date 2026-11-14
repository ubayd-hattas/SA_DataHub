/**
 * The rows of /fuel/history: every monthly adjustment, newest first, with the
 * change in cents from the month before. The page and the CSV both read from
 * here, so the download holds exactly the rows the table shows.
 */
import { csvRow } from '@/lib/export'
import {
  FUEL_PRODUCTS,
  FUEL_ZONES,
  fuelAdjustments,
  type FuelAdjustment,
  type FuelProduct,
  type FuelZone,
} from '@/lib/fuel'

export const FUEL_HISTORY_PATH = '/fuel/history'
export const FUEL_HISTORY_CSV_PATH = '/data/fuel-history.csv'

export interface FuelHistoryCell {
  /** Cents per litre, or null when no held DMPR file gives the price. */
  cents: number | null
  /**
   * Change in cents from the month before. null when this month or the month
   * before has no price, and for the first month in the data.
   */
  changeCents: number | null
}

export interface FuelHistoryRow {
  month: string
  effectiveFrom: string
  source: { document: string; url: string }
  cells: Record<FuelProduct, Record<FuelZone, FuelHistoryCell>>
}

function cellFor(
  current: FuelAdjustment,
  previous: FuelAdjustment | undefined,
  product: FuelProduct,
  zone: FuelZone
): FuelHistoryCell {
  const cents = current.prices[product][zone]
  const before = previous?.prices[product][zone] ?? null
  return { cents, changeCents: cents !== null && before !== null ? cents - before : null }
}

/** Every adjustment, newest first. */
export function fuelHistoryRows(): FuelHistoryRow[] {
  const oldestFirst = fuelAdjustments()
  return oldestFirst
    .map((adj, i): FuelHistoryRow => {
      const previous = oldestFirst[i - 1]
      const cells = Object.fromEntries(
        FUEL_PRODUCTS.map((p) => [
          p.id,
          Object.fromEntries(FUEL_ZONES.map((z) => [z.id, cellFor(adj, previous, p.id, z.id)])),
        ])
      ) as FuelHistoryRow['cells']
      return { month: adj.month, effectiveFrom: adj.effectiveFrom, source: adj.source, cells }
    })
    .reverse()
}

const CSV_HEADER = [
  'month',
  'effective_from',
  'product',
  'zone',
  'cents_per_litre',
  'change_cents',
  'source_document',
  'source_url',
]

/** One line per month, product and zone, in the publisher's units (cents per litre). A missing price is an empty field. */
export function fuelHistoryCsv(): string {
  const lines = [csvRow(CSV_HEADER)]
  for (const row of fuelHistoryRows()) {
    for (const product of FUEL_PRODUCTS) {
      for (const zone of FUEL_ZONES) {
        const cell = row.cells[product.id][zone.id]
        lines.push(
          csvRow([
            row.month,
            row.effectiveFrom,
            product.id,
            zone.id,
            cell.cents,
            cell.changeCents,
            row.source.document,
            row.source.url,
          ])
        )
      }
    }
  }
  return `${lines.join('\n')}\n`
}
