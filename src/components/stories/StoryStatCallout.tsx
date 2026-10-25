'use client'

/**
 * src/components/stories/StoryStatCallout.tsx
 *
 * Compact stat callout for use inside scroll story narrative columns.
 * More compact than the full StatCallout to suit the 7/12-width column.
 */

import { Statistic } from '@/types'
import { cn, getGoodDirection } from '@/lib/utils'
import { DeltaBadge, getDeltaSemantics } from '@/components/ui/DeltaBadge'

interface StoryStatCalloutProps {
  stat: Statistic
  className?: string
}

export function StoryStatCallout({ stat, className }: StoryStatCalloutProps) {
  const semantics = getDeltaSemantics(stat.trend, getGoodDirection(stat))

  return (
    <div
      className={cn(
        'my-6 flex items-start gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900',
        className
      )}
    >
      {/* Semantic left border accent */}
      <div
        className={cn(
          'w-1 self-stretch shrink-0',
          semantics === 'positive'      && 'bg-brand-400',
          semantics === 'negative'      && 'bg-red-400',
          semantics === 'neutral'       && 'bg-slate-300 dark:bg-slate-700',
          semantics === 'informational' && 'bg-blue-400'
        )}
        aria-hidden="true"
      />

      <div className="flex flex-1 flex-col gap-2 py-4 pr-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-mono text-3xl font-medium tabular-nums leading-none text-slate-900 dark:text-white">
            {stat.value}
          </p>
          <DeltaBadge
            delta={stat.change}
            trend={stat.trend}
            semantics={semantics}
            unit={stat.unit}
            className="mt-0.5 shrink-0"
          />
        </div>

        {stat.changeLabel && (
          <p className="text-xs text-slate-400">{stat.changeLabel}</p>
        )}

        <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{stat.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {stat.description}
          </p>
        </div>
      </div>
    </div>
  )
}
