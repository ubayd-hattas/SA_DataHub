"use client";

import { useState } from 'react'
import { TrendingUp, History, Lightbulb, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Statistic } from '@/types'
import { generateExplanation } from '@/lib/explanations'
import { cn } from '@/lib/utils'

interface DatasetExplanationProps {
  stat: Statistic
  className?: string
  defaultOpen?: boolean
}

interface Section {
  id: string
  icon: typeof TrendingUp
  title: string
  body: string
  accent: string
}

export function DatasetExplanation({ stat, className, defaultOpen = false }: DatasetExplanationProps) {
  const [open, setOpen] = useState(defaultOpen)
  const explanation = generateExplanation(stat)

  const sections: Section[] = [
    {
      id: 'changed',
      icon: TrendingUp,
      title: 'What changed',
      body: explanation.whatChanged,
      accent: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30',
    },
    {
      id: 'trend',
      icon: History,
      title: 'Long-term trend',
      body: explanation.longTermTrend,
      accent: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30',
    },
    {
      id: 'matters',
      icon: Lightbulb,
      title: 'Why it matters',
      body: explanation.whyItMatters,
      accent: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
    },
    {
      id: 'context',
      icon: AlertCircle,
      title: 'Important context',
      body: explanation.importantContext,
      accent: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
    },
  ]

  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900', className)}>
      {/* Header — always visible, toggles body */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/30">
            <Lightbulb size={14} className="text-brand-600 dark:text-brand-400" />
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Understanding this data
          </span>
        </div>
        {open
          ? <ChevronUp size={16} className="text-muted shrink-0" />
          : <ChevronDown size={16} className="text-muted shrink-0" />
        }
      </button>

      {/* Expandable body */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 pb-5 pt-4 grid gap-4 sm:grid-cols-2">
          {sections.map(({ id, icon: Icon, title, body, accent }) => (
            <div key={id} className="flex flex-col gap-2">
              <div className={cn('inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', accent)}>
                <Icon size={11} />
                {title}
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
