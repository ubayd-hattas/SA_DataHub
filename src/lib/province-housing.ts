import type { ProvinceHousingShares } from '@/types'

/** A province row of Provinces at a glance, as in src/data/census-provinces.json. */
interface CensusProvinceRow {
  name: string
  housing1: { printedPage: number; values: number[] }
  housing2: { printedPage: number; values: number[] }
}

/** One decimal, computed the same way as in census-change.ts. */
function share(part: number, ...parts: number[]): number {
  const v = (100 * part) / parts.reduce((a, b) => a + b, 0)
  return Math.round(v * 10) / 10
}

/**
 * Housing and services for one province from its rows in Provinces at a
 * glance. Each share is a category over the sum of its categories, as on
 * municipality pages (cooking leaves out "none").
 */
export function housingFromCensusRow(p: CensusProvinceRow): ProvinceHousingShares {
  const h1 = p.housing1.values
  const h2 = p.housing2.values
  return {
    formal: [share(h1[4], h1[4], h1[5], h1[6], h1[7]), share(h1[8], h1[8], h1[9], h1[10], h1[11])],
    waterScheme: [share(h2[0], h2[0], h2[1]), share(h2[2], h2[2], h2[3])],
    flushToilet: [share(h2[4], h2[4], h2[5], h2[6]), share(h2[7], h2[7], h2[8], h2[9])],
    electricityCooking: [share(h2[10], h2[10], h2[11], h2[12]), share(h2[13], h2[13], h2[14], h2[15])],
    pages: { housing1: p.housing1.printedPage, housing2: p.housing2.printedPage },
  }
}
