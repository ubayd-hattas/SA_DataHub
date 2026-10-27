'use client'

import { useId, useState } from 'react'
import { VALUE_YEARS, valueToday } from '@/lib/cpi-history'
import { formatDecimal, formatRand } from '@/lib/format'

const DEFAULT_YEAR = 2000

const FIELD =
  'w-full border-0 border-b border-ink/40 bg-transparent px-0 py-2 text-body tabular-nums text-ink focus:border-accent focus:outline-none focus:ring-0 focus-visible:border-b-2'

/**
 * "What money was worth": an amount in a past year at today's prices, using
 * the CPI headline index (Table B1). The working is shown under the answer.
 */
export function ValueCalculator() {
  const yearId = useId()
  const amountId = useId()
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [amountText, setAmountText] = useState('100')

  const amount = Number(amountText.replace(/[\s,]/g, ''))
  const valid = amountText.trim() !== '' && Number.isFinite(amount) && amount >= 0
  const result = valid ? valueToday(year, amount) : null

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
            aria-invalid={!valid}
            className={FIELD}
          />
        </div>
      </div>

      <div aria-live="polite" className="mt-8">
        {result ? (
          <>
            <p className="text-body text-ink">
              {formatRand(result.amount, Number.isInteger(result.amount) ? 0 : 2)} in {result.year} had about the same buying power as
            </p>
            {/* Whole rands in the answer; the working below keeps cents. */}
            <p className="mt-1 font-display text-[3rem] font-semibold leading-none tabular-nums text-ink sm:text-figure">
              {formatRand(result.equivalent, 0)}
            </p>
            <p className="mt-2 text-body text-ink">in {result.nowLabel}.</p>

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
          <p className="text-small font-medium text-bad">Enter an amount of zero or more, in rand.</p>
        )}
      </div>
    </div>
  )
}
