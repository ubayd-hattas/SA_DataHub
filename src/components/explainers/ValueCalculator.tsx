'use client'

import { useEffect, useId, useState } from 'react'
import { Share2 } from 'lucide-react'
import { VALUE_YEARS, valueToday } from '@/lib/cpi-history'
import { formatDecimal, formatRand } from '@/lib/format'
import { DEFAULT_AMOUNT, DEFAULT_YEAR, formatInputRand, moneyValueHref, parseAmount } from '@/lib/money-value'

const FIELD =
  'w-full border-0 border-b border-ink/40 bg-transparent px-0 py-2 text-body tabular-nums text-ink focus:border-accent focus:outline-none focus:ring-0 focus-visible:border-b-2'

/**
 * "What money was worth": an amount in a past year at today's prices, using
 * the CPI headline index (Table B1). The working is shown under the answer.
 * With `syncUrl`, the address bar follows the inputs so the answer can be shared.
 */
export function ValueCalculator({
  initialYear = DEFAULT_YEAR,
  initialAmount = DEFAULT_AMOUNT,
  syncUrl = false,
}: {
  initialYear?: number
  initialAmount?: number
  syncUrl?: boolean
}) {
  const yearId = useId()
  const amountId = useId()
  const [year, setYear] = useState(initialYear)
  const [amountText, setAmountText] = useState(String(initialAmount))
  const [shareStatus, setShareStatus] = useState('')

  const amount = parseAmount(amountText)
  const result = amount === null ? null : valueToday(year, amount)

  // replaceState, not a navigation: typing should not add history entries or re-render the page.
  useEffect(() => {
    if (!syncUrl || amount === null) return
    window.history.replaceState(null, '', moneyValueHref(year, amount))
  }, [syncUrl, year, amount])

  async function share() {
    if (amount === null) return
    const url = new URL(moneyValueHref(year, amount), window.location.origin).toString()
    try {
      if (navigator.share) {
        await navigator.share({ title: 'What was money worth?', url })
        setShareStatus('')
      } else {
        await navigator.clipboard.writeText(url)
        setShareStatus('Link copied.')
      }
    } catch (err) {
      // Closing the share sheet is not an error worth showing.
      if ((err as Error).name !== 'AbortError') setShareStatus('Could not copy the link. Copy it from the address bar instead.')
    }
  }

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={yearId} className="block text-small font-medium text-muted">
            Year
          </label>
          <select id={yearId} value={year} onChange={(e) => setYear(Number(e.target.value))} className={FIELD}>
            {VALUE_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={amountId} className="block text-small font-medium text-muted">
            Amount in rand
          </label>
          <input
            id={amountId}
            type="text"
            inputMode="decimal"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            aria-invalid={amount === null}
            aria-describedby={amount === null ? `${amountId}-error` : undefined}
            className={FIELD}
          />
        </div>
      </div>

      <div aria-live="polite" className="mt-8">
        {result ? (
          <>
            <p className="text-body text-ink">
              {formatInputRand(result.amount)} in {result.year} had about the same buying power as
            </p>
            {/* Whole rands in the answer; the working below keeps cents. */}
            <p className="mt-1 font-display text-[3rem] font-semibold leading-none tabular-nums text-ink sm:text-figure">
              {formatRand(result.equivalent, 0)}
            </p>
            <p className="mt-2 text-body text-ink">in {result.nowLabel}.</p>

            {syncUrl && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={share}
                  className="inline-flex items-center gap-2 rounded border border-rule px-3 py-2 text-small font-medium text-ink hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Share2 size={16} aria-hidden="true" />
                  Share this answer
                </button>
                {shareStatus && <span className="text-small text-muted">{shareStatus}</span>}
              </div>
            )}

            <div className="mt-6 border-l-2 border-rule pl-4">
              <p className="text-small font-medium text-ink">How this is worked out</p>
              <p className="mt-1 text-small tabular-nums text-ink">
                {formatRand(result.amount)} × {formatDecimal(result.indexNow)} ÷ {formatDecimal(result.indexThen)} = {formatRand(result.equivalent)}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-caption text-muted">
                <li>{formatDecimal(result.indexThen)} is the average CPI index for {result.year}.</li>
                <li>{formatDecimal(result.indexNow)} is the CPI index for {result.nowLabel}, the latest month.</li>
                <li>
                  The index is published to one decimal place, so the answer could be anywhere from{' '}
                  {formatRand(result.low)} to {formatRand(result.high)}.
                </li>
              </ul>
            </div>
          </>
        ) : (
          <p id={`${amountId}-error`} className="text-small font-medium text-bad">
            Enter an amount in rand, for example 100 or 1 500.50.
          </p>
        )}
      </div>
    </div>
  )
}
