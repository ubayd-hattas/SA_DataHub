'use client'

import { useSyncExternalStore } from 'react'
import { formatLongDate } from '@/lib/explainers'

/**
 * Shown once the next scheduled adjustment has taken effect but its prices are
 * not on the site yet. The page is built ahead of time, so the check runs in
 * the reader's browser against today's date. Without JavaScript the effective
 * date printed beside the price still says which month it is.
 */
const noSubscription = () => () => {}
const todayInBrowser = () => new Date().toISOString().slice(0, 10)
// On the server, and while hydrating, there is no "today" yet, so nothing is shown.
const noDateOnServer = () => null

export function FuelStaleNote({ effectiveFrom, nextChange }: { effectiveFrom: string; nextChange: string | null }) {
  const today = useSyncExternalStore(noSubscription, todayInBrowser, noDateOnServer)
  if (!nextChange || !today || today < nextChange) return null
  return (
    <p role="note" className="mt-4 max-w-prose border-l-2 border-bad pl-3 text-small text-ink">
      <strong className="font-semibold">These prices may be out of date. </strong>
      They took effect on {formatLongDate(effectiveFrom)}. The next adjustment was due on {formatLongDate(nextChange)},
      and SA Data Hub has not added it yet.
    </p>
  )
}
