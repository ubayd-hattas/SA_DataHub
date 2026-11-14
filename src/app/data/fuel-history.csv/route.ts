import { fuelHistoryCsv } from '@/lib/fuel-history'

/**
 * /data/fuel-history.csv: every row of the /fuel/history table, built at build
 * time. A folder of its own, because the [file] route beside it only serves
 * datasets from the registry.
 */
export const dynamic = 'force-static'

export function GET() {
  return new Response(fuelHistoryCsv(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'inline; filename="fuel-history.csv"',
    },
  })
}
