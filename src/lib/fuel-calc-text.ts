/**
 * The words around a fuel cost: the working, the change from last month, the
 * one-sentence summary used for sharing. Kept apart from the form so the
 * wording is tested and the share image and WhatsApp link say the same thing.
 */
import { formatDecimal, formatRand } from '@/lib/format'
import { monthLabel, type FuelProduct, type FuelZone } from '@/lib/fuel'
import { DEFAULT_LITRES, priceText, type FuelCostResult } from '@/lib/fuel-calc'
import { DEFAULT_PRODUCT, DEFAULT_ZONE, FUEL_PATH, productInfo, productName, zoneLabel } from '@/lib/fuel-page'

type Ok = Extract<FuelCostResult, { ok: true }>

/** "45", "52.5", "1 000": no trailing zeros. */
export function litresNumber(litres: number): string {
  const decimals = Number.isInteger(litres) ? 0 : Number.isInteger(litres * 10) ? 1 : 2
  return formatDecimal(litres, decimals)
}

/** "1 litre", "45 litres". */
export function litresText(litres: number): string {
  return `${litresNumber(litres)} ${litres === 1 ? 'litre' : 'litres'}`
}

export const rands = (cents: number) => formatRand(cents / 100)

/** "45 litres × R30.24 = R1 360.80" */
export function workingText(r: Ok): string {
  return `${litresText(r.litres)} × ${priceText(r.priceCents)} = ${rands(r.costCents)}`
}

/** "Petrol 95, inland, Nov 2026" */
export function selectionText(r: Ok): string {
  return `${productName(r.product)}, ${zoneLabel(r.zone).toLowerCase()}, ${monthLabel(r.month)}`
}

/** "R0.45 less than in Oct 2026 (R1 361.25)." Nothing when there is no earlier month to compare. */
export function changeText(r: Ok): string | null {
  const p = r.previous
  if (!p) return null
  const when = monthLabel(p.month)
  if (p.differenceCents === 0) return `The same as in ${when} (${rands(p.costCents)}).`
  const size = rands(Math.abs(p.differenceCents))
  return `${size} ${p.differenceCents > 0 ? 'more' : 'less'} than in ${when} (${rands(p.costCents)}).`
}

/** Said under the result for diesel and paraffin, which have no regulated pump price. */
export function wholesaleNote(r: Ok): string | null {
  const info = productInfo(r.product)
  if (info.priceType !== 'wholesale') return null
  return `This is the official wholesale price. Filling stations set their own pump price for ${info.officialName}, so the price you pay will differ.`
}

/** "45 litres of Petrol 95 in inland South Africa cost R1 360.80 in Nov 2026." */
export function costSentence(r: Ok): string {
  const info = productInfo(r.product)
  const price = info.priceType === 'wholesale' ? ' at the wholesale price' : ''
  return `${litresText(r.litres)} of ${info.label}${price} cost ${rands(r.costCents)} in ${monthLabel(r.month)} (${zoneLabel(r.zone).toLowerCase()} price).`
}

/** The text for the litres box: what the address says (so a bad value shows its error), else the default. */
export function litresFromParams(params: Record<string, string | string[] | undefined>): string {
  const value = Array.isArray(params.litres) ? params.litres[0] : params.litres
  return value === undefined ? String(DEFAULT_LITRES) : value.slice(0, 20)
}

/**
 * The address of an answer. It uses the same product and zone parameters as
 * the page, so the headline and the calculator agree when the link is opened.
 * Anything left at its default is left out; all defaults is the bare /fuel.
 */
export function calcHref({ litres, product, zone }: { litres: number; product: FuelProduct; zone: FuelZone }): string {
  const query = new URLSearchParams()
  if (litres !== DEFAULT_LITRES) query.set('litres', String(litres))
  if (product !== DEFAULT_PRODUCT) query.set('product', productInfo(product).slug)
  if (zone !== DEFAULT_ZONE) query.set('zone', zone)
  const text = query.toString()
  return text ? `${FUEL_PATH}?${text}` : FUEL_PATH
}
