'use client'

import { useId, useState } from 'react'
import { guessFeedback, formatGuess, type GuessUnit } from '@/lib/guess'

export interface GuessFirstProps {
  /** The question, also the slider's label. */
  question: string
  min: number
  max: number
  step: number
  unit: GuessUnit
  /** The published figure. */
  value: number
  /** Where the figure comes from, e.g. "Stats SA P0141 September 2026, Table A, page 3". */
  source: string
}

const BUTTON =
  'inline-flex items-center rounded border px-3 py-2 text-small font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

/**
 * "Guess first": move the slider, then reveal the published figure with its
 * source. The figure also appears further down the page, so skipping loses
 * nothing. Arrow keys move the slider; both buttons are ordinary buttons.
 */
export function GuessFirst({ question, min, max, step, unit, value, source }: GuessFirstProps) {
  const id = useId()
  const [guess, setGuess] = useState(() => min + Math.round((max - min) / 2 / step) * step)
  const [state, setState] = useState<'guessing' | 'guessed' | 'skipped'>('guessing')
  const revealed = state !== 'guessing'

  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-small font-medium uppercase tracking-wide text-muted">
        Guess first
      </h2>
      <label htmlFor={`${id}-slider`} className="mt-2 block text-body text-ink">
        {question}
      </label>
      <div className="mt-4 flex items-center gap-4">
        <input
          id={`${id}-slider`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={guess}
          disabled={revealed}
          aria-valuetext={formatGuess(guess, unit)}
          onChange={(e) => setGuess(Number(e.target.value))}
          className="min-w-0 flex-1 accent-accent disabled:opacity-60"
        />
        <output htmlFor={`${id}-slider`} className="w-28 shrink-0 text-right font-display text-lede font-semibold tabular-nums text-ink">
          {formatGuess(guess, unit)}
        </output>
      </div>
      {!revealed && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setState('guessed')} className={`${BUTTON} border-ink bg-ink text-paper hover:opacity-90`}>
            Show the answer
          </button>
          <button type="button" onClick={() => setState('skipped')} className={`${BUTTON} border-rule text-ink hover:bg-subtle`}>
            Skip
          </button>
        </div>
      )}
      <div aria-live="polite" className="mt-4">
        {revealed && (
          <>
            <p className="text-body text-ink">
              The published figure is{' '}
              <strong className="font-semibold tabular-nums">{formatGuess(value, unit)}</strong>.
              {state === 'guessed' && <> {guessFeedback(guess, value, unit)}</>}
            </p>
            <p className="mt-1 text-caption text-muted">Source: {source}</p>
          </>
        )}
      </div>
    </section>
  )
}
