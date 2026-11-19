/**
 * The data behind /api/v1/fuel/*. Prices are in cents per litre, exactly as
 * the DMPR printed them; null means no document SA Data Hub holds gives that
 * price. DMPR material may be reused only accurately, non-commercially and
 * with credit, so every response repeats those terms.
 */
import { apiMeta, type ApiMeta } from '@/lib/api-envelope'
import { FUEL_PRODUCTS, FUEL_PUBLISHER, FUEL_TERMS, FUEL_ZONES, fuelAdjustments, latestAdjustment, type FuelAdjustment } from '@/lib/fuel'
import { BREAKDOWN_META, BREAKDOWN_PRODUCTS, breakdownFor } from '@/lib/fuel-breakdown'
import pricesFile from '@/data/fuel/prices.json'

const ATTRIBUTION = 'Source: Department of Mineral and Petroleum Resources (DMPR). Via SA Data Hub, https://sadatahub.tech/fuel'

const PRODUCT_INFO = FUEL_PRODUCTS.map((p) => ({ id: p.id, name: p.label, officialName: p.officialName, priceType: p.priceType }))
const ZONE_INFO = FUEL_ZONES.map((z) => ({ id: z.id, name: z.label, detail: z.detail }))

function adjustmentSource(a: FuelAdjustment) {
  return { publisher: FUEL_PUBLISHER.name, document: a.source.document, url: a.source.url, releasedOn: a.releasedOn ?? null }
}

function fuelMeta(a: FuelAdjustment, estimate = false): ApiMeta {
  return apiMeta({
    source: adjustmentSource(a),
    checkedOn: PRICES_CHECKED_ON,
    attribution: ATTRIBUTION,
    terms: FUEL_TERMS,
    estimate,
  })
}

/** The price file records one checked date for the whole file. */
const PRICES_CHECKED_ON = (pricesFile as unknown as { _meta: { checked_on: string } })._meta.checked_on

export function fuelLatestData() {
  const latest = latestAdjustment()
  const all = fuelAdjustments()
  const previous = all.at(-2)
  return {
    month: latest.month,
    effectiveFrom: latest.effectiveFrom,
    unit: 'cents_per_litre',
    products: PRODUCT_INFO,
    zones: ZONE_INFO,
    prices: FUEL_PRODUCTS.flatMap((p) =>
      FUEL_ZONES.map((z) => {
        const cents = latest.prices[p.id][z.id]
        const before = previous?.prices[p.id][z.id] ?? null
        return {
          product: p.id,
          zone: z.id,
          cents,
          changeFromPreviousMonth: cents !== null && before !== null ? Math.round((cents - before) * 1000) / 1000 : null,
        }
      })
    ),
  }
}

export function fuelLatestMeta() {
  return fuelMeta(latestAdjustment())
}

export function fuelHistoryData() {
  return {
    unit: 'cents_per_litre',
    products: PRODUCT_INFO,
    zones: ZONE_INFO,
    adjustments: fuelAdjustments().map((a) => ({
      month: a.month,
      effectiveFrom: a.effectiveFrom,
      source: adjustmentSource(a),
      enteredFrom: a.enteredFrom,
      note: a.note ?? null,
      prices: a.prices,
    })),
  }
}

export function fuelHistoryMeta() {
  return fuelMeta(latestAdjustment())
}

export function fuelBreakdownData() {
  return {
    unit: 'cents_per_litre',
    zone: 'inland',
    covers: BREAKDOWN_META.covers,
    products: BREAKDOWN_PRODUCTS.map((product) => {
      const b = breakdownFor(product)
      return b
        ? {
            product,
            month: b.month,
            total: b.total,
            groups: b.groups.map(({ id, label, cents, share }) => ({ id, label, cents, share: Math.round(share * 10000) / 10000 })),
            elements: b.elements,
          }
        : { product, month: null, total: null, groups: [], elements: [] }
    }),
    excluded: BREAKDOWN_META.excluded,
  }
}

export function fuelBreakdownMeta() {
  return apiMeta({
    source: { publisher: FUEL_PUBLISHER.name, document: BREAKDOWN_META.document, url: BREAKDOWN_META.url, releasedOn: BREAKDOWN_META.released_on },
    checkedOn: BREAKDOWN_META.checked_on,
    attribution: ATTRIBUTION,
    terms: FUEL_TERMS,
    estimate: false,
  })
}
