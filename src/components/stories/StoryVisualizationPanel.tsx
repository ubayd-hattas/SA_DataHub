'use client'

/**
 * src/components/stories/StoryVisualizationPanel.tsx
 *
 * Renders the chart configuration defined in a StoryChapter.
 * Reuses the existing LineChartCard and BarChartCard components.
 */

import { LineChartCard } from '@/components/charts/LineChartCard'
import { BarChartCard } from '@/components/charts/BarChartCard'
import type { StoryVisualization } from '@/types/scroll-story'
import type { Statistic } from '@/types'

interface StoryVisualizationPanelProps {
  config: StoryVisualization
  stat: Statistic
  className?: string
}

export function StoryVisualizationPanel({ config, stat, className }: StoryVisualizationPanelProps) {
  if (!stat.series || stat.series.length === 0) {
    return (
      <div className={`flex h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 ${className}`}>
        No series data available for {stat.id}
      </div>
    )
  }

  return (
    <div className={className}>
      {config.type === 'line' && (
        <LineChartCard
          title={stat.title}
          series={stat.series}
          height={config.height ?? 300}
          stat={stat}
          highlightPeriod={config.highlightPeriod}
        />
      )}
      
      {config.type === 'bar' && (
        <BarChartCard
          title={stat.title}
          series={stat.series}
          height={config.height ?? 300}
          stat={stat}
        />
      )}

      {config.note && (
        <p className="mt-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
          {config.note}
        </p>
      )}
    </div>
  )
}
