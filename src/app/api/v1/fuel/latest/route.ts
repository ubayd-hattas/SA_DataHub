import { apiResponse } from '@/lib/api-envelope'
import { fuelLatestData, fuelLatestMeta } from '@/lib/api-fuel'

/** This month's official price for every product and zone, in cents per litre. Built at build time. */
export const dynamic = 'force-static'

export function GET() {
  return apiResponse(fuelLatestData(), fuelLatestMeta())
}
