import { cn } from '@/lib/utils'

export type Tone = 'good' | 'bad' | 'neutral'

const TONE_CLASS: Record<Tone, string> = {
  good: 'text-good',
  bad: 'text-bad',
  neutral: 'text-ink',
}

/**
 * A change in words. Colour marks good or bad, but the words always say
 * which way it moved, so colour is never the only signal.
 */
export function Change({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={cn('font-medium', TONE_CLASS[tone])}>{children}</span>
}

/**
 * The standard number block: a label, the big value, one line of plain
 * English about what it means, then a small source line.
 */
export function NumberBlock({
  label,
  value,
  meaning,
  source,
  className,
}: {
  label: string
  value: React.ReactNode
  meaning: React.ReactNode
  source: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-small font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-[3rem] font-semibold leading-none tabular-nums text-ink sm:text-figure">{value}</p>
      <p className="mt-3 text-body text-ink">{meaning}</p>
      <div className="mt-3">{source}</div>
    </div>
  )
}
