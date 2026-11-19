import { apiResponse } from '@/lib/api-envelope'
import { fuelHistoryData, fuelHistoryMeta } from '@/lib/api-fuel'

/** Every monthly adjustment since January 2022, with the source document for each month. Built at build time. */
export const dynamic = 'force-static'

export function GET() {
  return apiResponse(fuelHistoryData(), fuelHistoryMeta())
}
