/**
 * The one number format for the site (docs/DESIGN.md):
 * a decimal point, one decimal place, and a non-breaking space between
 * thousands. Written by hand so the server and the browser render the same
 * string whatever the locale data.
 */

const NBSP = ' '

/** "1 234 567" with non-breaking spaces. */
export function groupThousands(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
}

/** "12 345.6". One decimal unless told otherwise. */
export function formatDecimal(value: number, decimals = 1): string {
  const fixed = Math.abs(value).toFixed(decimals)
  const [whole, fraction] = fixed.split('.')
  const sign = value < 0 && Number(fixed) !== 0 ? '-' : ''
  return `${sign}${groupThousands(whole)}${fraction ? `.${fraction}` : ''}`
}

/** A count of people, households or things: "1 234 567". */
export function formatCount(value: number): string {
  return formatDecimal(value, 0)
}

/** "4.5%". */
export function formatPercent(value: number, decimals = 1): string {
  return `${formatDecimal(value, decimals)}%`
}

/** "1.5 points" or "1.0 point". Percentage-point differences. */
export function formatPoints(value: number): string {
  return `${formatDecimal(value)} ${Math.abs(value) === 1 ? 'point' : 'points'}`
}

/** "+0.4" or "-0.4", for a change. Zero has no sign. */
export function formatSigned(value: number, decimals = 1): string {
  const text = formatDecimal(value, decimals)
  return value > 0 && Number(value.toFixed(decimals)) !== 0 ? `+${text}` : text
}

/** Two decimals if any value needs them (a policy rate series: 7.00%, 7.25%), otherwise one. */
export function percentDecimals(values: number[]): number {
  return values.some((v) => Math.round(v * 100) % 10 !== 0) ? 2 : 1
}

/**
 * One value in a series' own unit: "4.5%", "7.25%", "26 232", "63.5 million",
 * "R7 071 billion". Pass `decimals` from percentDecimals so a whole series uses one precision.
 */
export function formatSeriesValue(value: number, unit: string, decimals = percentDecimals([value])): string {
  switch (unit) {
    case '%':
      return formatPercent(value, decimals)
    case 'million':
      return `${formatDecimal(value)} million`
    case 'ZAR billion':
      return `R${formatCount(value)} billion`
    case 'ZAR':
      return formatRand(value, 0)
    default:
      return formatCount(value)
  }
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "11 Aug 2026" from "2026-08-11", for compact source lines. */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${SHORT_MONTHS[m - 1]} ${y}`
}

/**
 * "R1 045.45". Rand amounts keep cents because they are prices; every
 * other number on the site uses one decimal.
 */
export function formatRand(value: number, decimals = 2): string {
  return `${value < 0 ? '-' : ''}R${formatDecimal(Math.abs(value), decimals)}`
}
