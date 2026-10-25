import { Statistic } from '@/types'
import { cn, getGoodDirection, formatDate } from '@/lib/utils'
import { DeltaBadge, getDeltaSemantics } from '@/components/ui/DeltaBadge'

interface StatCalloutProps {
  stat: Statistic
  className?: string
}

export function StatCallout({ stat, className }: StatCalloutProps) {
  const semantics = getDeltaSemantics(stat.trend, getGoodDirection(stat))

  return (
    <div
      className={cn(
        'my-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900',
        className
      )}
    >
      {/* Semantic accent bar */}
      <div
        className={cn(
          'h-1 w-full',
          semantics === 'positive' && 'bg-brand-400',
          semantics === 'negative' && 'bg-red-400',
          semantics === 'neutral'  && 'bg-slate-300 dark:bg-slate-700',
          semantics === 'informational' && 'bg-blue-400'
        )}
      />

      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
        {/* Big value + delta */}
        <div className="shrink-0">
          <p className="font-mono text-4xl font-medium tabular-nums leading-none text-slate-900 dark:text-white">
            {stat.value}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <DeltaBadge
              delta={stat.change}
              trend={stat.trend}
              semantics={semantics}
              unit={stat.unit}
              size="sm"
            />
            {stat.changeLabel && (
              <span className="text-xs text-slate-400">{stat.changeLabel}</span>
            )}
          </div>
        </div>

        {/* Vertical divider (desktop) */}
        <div className="hidden h-14 w-px shrink-0 bg-slate-100 dark:bg-slate-800 sm:block" aria-hidden="true" />

        {/* Context */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{stat.title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {stat.description}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {stat.source.shortName}
            {stat.lastUpdated && (
              <> · Updated {formatDate(stat.lastUpdated)}</>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
