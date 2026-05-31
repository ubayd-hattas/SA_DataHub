import { Lightbulb, TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from 'lucide-react'
import { Insight, InsightType, InsightSentiment } from '@/types'
import { cn } from '@/lib/utils'

interface InsightPanelProps {
  insight: Insight
  className?: string
  compact?: boolean
}

function sentimentStyles(sentiment: InsightSentiment) {
  switch (sentiment) {
    case 'positive':
      return {
        bg: 'bg-brand-50 dark:bg-brand-950/30',
        border: 'border-brand-200 dark:border-brand-800',
        text: 'text-brand-800 dark:text-brand-200',
        icon: 'text-brand-600 dark:text-brand-400',
        badge: 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300',
      }
    case 'negative':
      return {
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-900 dark:text-red-100',
        icon: 'text-red-600 dark:text-red-400',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      }
    case 'mixed':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-900 dark:text-amber-100',
        icon: 'text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
      }
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-800/50',
        border: 'border-slate-200 dark:border-slate-700',
        text: 'text-slate-800 dark:text-slate-200',
        icon: 'text-slate-500 dark:text-slate-400',
        badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      }
  }
}

function TypeIcon({ type, className }: { type: InsightType; className?: string }) {
  switch (type) {
    case 'turning-point': return <RefreshCw size={14} className={className} />
    case 'warning':       return <AlertTriangle size={14} className={className} />
    case 'trend':
      return <TrendingUp size={14} className={className} />
    default:
      return <Lightbulb size={14} className={className} />
  }
}

const typeLabels: Record<InsightType, string> = {
  trend: 'Trend',
  'turning-point': 'Turning point',
  context: 'Context',
  comparison: 'Comparison',
  warning: 'Watch',
}

export function InsightPanel({ insight, className, compact = false }: InsightPanelProps) {
  const styles = sentimentStyles(insight.sentiment)

  return (
    <div className={cn('rounded-xl border p-4', styles.bg, styles.border, className)}>
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 shrink-0', styles.icon)}>
          <TypeIcon type={insight.type} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', styles.badge)}>
              {typeLabels[insight.type]}
            </span>
            {insight.generatedFrom && !compact && (
              <span className="text-xs text-slate-400">
                Based on {insight.generatedFrom}
              </span>
            )}
          </div>
          <p className={cn('text-sm font-medium leading-relaxed', styles.text)}>
            {insight.summary}
          </p>
          {!compact && insight.details && insight.details.length > 0 && (
            <ul className="mt-2 space-y-1">
              {insight.details.map((d, i) => (
                <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-slate-400 shrink-0" />
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
