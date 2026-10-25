import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, type GoodDirection } from '@/lib/utils'

/**
 * DeltaBadge — reusable trend delta indicator.
 *
 * IMPORTANT: Do NOT assume up = positive. The caller determines semantic
 * meaning from domain context:
 *   - unemployment up   → negative
 *   - GDP growth up     → positive
 *   - inflation up      → negative
 *
 * Pass `semantics` as the computed result of getDeltaSemantics().
 */

export type DeltaSemantics = 'positive' | 'negative' | 'neutral' | 'informational'

interface DeltaBadgeProps {
  /** Numeric delta value — sign is inferred from trend, absolute displayed */
  delta: number
  /** Direction of change */
  trend: 'up' | 'down' | 'stable'
  /** Semantic meaning — caller's responsibility, not the component's */
  semantics: DeltaSemantics
  /** The unit of the parent statistic. '%' stats show delta in pp. */
  unit?: string
  /** Short period context, e.g. "vs Q4 2023" or "year-on-year" */
  periodLabel?: string
  className?: string
  /** Size variant */
  size?: 'xs' | 'sm'
}

const semanticsStyles: Record<DeltaSemantics, { bg: string; text: string }> = {
  positive:      { bg: 'bg-brand-50 dark:bg-brand-950/40',  text: 'text-brand-700 dark:text-brand-300' },
  negative:      { bg: 'bg-red-50 dark:bg-red-950/40',      text: 'text-red-700 dark:text-red-300'     },
  neutral:       { bg: 'bg-slate-100 dark:bg-slate-800',     text: 'text-slate-600 dark:text-slate-300' },
  informational: { bg: 'bg-blue-50 dark:bg-blue-950/40',     text: 'text-blue-700 dark:text-blue-300'   },
}

export function DeltaBadge({
  delta,
  trend,
  semantics,
  unit,
  periodLabel,
  className,
  size = 'xs',
}: DeltaBadgeProps) {
  const { bg, text } = semanticsStyles[semantics]
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  // Percentage stats: delta is in percentage points (pp), not %
  const unitDisplay = unit === '%' ? 'pp' : '%'
  const sizeClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-xs'
  const iconSize = size === 'sm' ? 12 : 11

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        sizeClass,
        bg,
        text,
        className
      )}
      title={`${delta > 0 ? '+' : ''}${delta.toFixed(1)}${unitDisplay}${periodLabel ? ' ' + periodLabel : ''}`}
      aria-label={`Change: ${Math.abs(delta).toFixed(1)} ${unitDisplay}${periodLabel ? ' ' + periodLabel : ''}`}
    >
      <Icon size={iconSize} aria-hidden="true" />
      <span className="tabular-nums">{Math.abs(delta).toFixed(1)}{unitDisplay}</span>
      {periodLabel && (
        <span className="hidden font-normal opacity-70 sm:inline">{periodLabel}</span>
      )}
    </span>
  )
}

/**
 * Derive DeltaSemantics from a Statistic's trend and its good direction.
 * Use this helper alongside getGoodDirection() so that callers don't
 * have to repeat the logic.
 */
export function getDeltaSemantics(
  trend: 'up' | 'down' | 'stable',
  goodDirection: GoodDirection
): DeltaSemantics {
  if (trend === 'stable' || goodDirection === 'neutral') return 'neutral'
  return trend === goodDirection ? 'positive' : 'negative'
}
