'use client'

import { useId, useState } from 'react'
import { VALUE_YEARS, valueToday } from '@/lib/cpi-history'
import { formatRand } from '@/lib/explainers'

const DEFAULT_YEAR = 2000

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
    <div className="card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={yearId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Year
          </label>
          <select
            id={yearId}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {VALUE_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={amountId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Amount in rand
          </label>
          <input
            id={amountId}
            type="text"
            inputMode="decimal"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            aria-invalid={!valid}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div aria-live="polite" className="mt-5">
        {result ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {formatRand(result.amount)} in {result.year} had about the same buying power as
            </p>
            <p className="stat-value mt-1">{formatRand(result.equivalent)}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">in {result.nowLabel}.</p>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
              <p className="mb-2 font-medium text-slate-700 dark:text-slate-200">How this is worked out</p>
              <p className="font-mono text-xs leading-relaxed tabular-nums text-slate-700 dark:text-slate-300">
                {formatRand(result.amount)} × {result.indexNow.toFixed(1)} ÷ {result.indexThen.toFixed(1)} = {formatRand(result.equivalent)}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-500 dark:text-slate-400">
                <li>{result.indexThen.toFixed(1)} is the average CPI index for {result.year}.</li>
                <li>{result.indexNow.toFixed(1)} is the CPI index for {result.nowLabel}, the latest month.</li>
                <li>
                  The index is published to one decimal place, so the answer could be anywhere from{' '}
                  {formatRand(result.low)} to {formatRand(result.high)}.
                </li>
              </ul>
            </div>
          </>
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400">Enter an amount of zero or more, in rand.</p>
        )}
      </div>
    </div>
  )
}
