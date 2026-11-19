import { apiResponse } from '@/lib/api-envelope'
import { fuelBreakdownData, fuelBreakdownMeta } from '@/lib/api-fuel'

/** What a litre is made of, inland, for the latest month the DMPR tables give. Built at build time. */
export const dynamic = 'force-static'

export function GET() {
  return apiResponse(fuelBreakdownData(), fuelBreakdownMeta())
}
