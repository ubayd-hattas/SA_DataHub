'use client'

/**
 * src/components/ui/CitationWidget.tsx
 *
 * SA Data Hub — Citation Widget
 *
 * 'use client' — uses useState for the expanded/collapsed state, active
 * citation style tab, and the copy-confirmation flash.
 *
 * Two usage modes:
 *
 *   1. Dataset-level (from the registry):
 *      <CitationWidget entry={entry} lastUpdated={lastUpdated} />
 *      Used in the Download Center (DatasetDownloadCard) and Category pages.
 *
 *   2. Stat-level:
 *      <CitationWidget stat={stat} />
 *      Available for future use (e.g. individual stat cards). Not used in V4.
 *
 * Props are mutually exclusive — pass either `entry` or `stat`, not both.
 *
 * ── Server/client boundary note ──────────────────────────────────────────────
 * Server components (category page, downloads page) pass `entry` or `stat` as
 * a plain serialisable prop. Both DatasetRegistryEntry and Statistic are fully
 * serialisable — no functions, no class instances.
 *
 * ── `navigator.clipboard` note ───────────────────────────────────────────────
 * The Clipboard API requires HTTPS or localhost. On Vercel this is always
 * satisfied. A graceful fallback (document.execCommand) is provided for plain
 * HTTP dev environments, but execCommand is deprecated — the fallback is
 * best-effort only.
 */

import { useState } from 'react'
import { Quote, Copy, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Statistic } from '@/types'
import { DatasetRegistryEntry } from '@/lib/registry'
import {
  CitationStyle,
  CitationResult,
  CITATION_STYLES,
  CITATION_STYLE_LABELS,
  generateCitation,
  generateDatasetCitation,
} from '@/lib/citation'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CitationWidgetEntryProps {
  /** Registry entry — use for dataset-level citation (most common in V4) */
  entry: DatasetRegistryEntry
  /** Pre-resolved last-updated ISO date for the entry (from getEntryLastUpdated) */
  lastUpdated?: string
  stat?: never
}

interface CitationWidgetStatProps {
  /** Single stat — use for indicator-level citation */
  stat: Statistic
  entry?: never
  lastUpdated?: never
}

type CitationWidgetProps = (CitationWidgetEntryProps | CitationWidgetStatProps) & {
  /** If true, the widget renders already expanded. Default: false (collapsed). */
  defaultOpen?: boolean
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CitationWidget({
  entry,
  stat,
  lastUpdated,
  defaultOpen = false,
  className,
}: CitationWidgetProps) {
  const [isOpen,      setIsOpen]      = useState(defaultOpen)
  const [activeStyle, setActiveStyle] = useState<CitationStyle>('apa')
  const [copied,      setCopied]      = useState(false)

  // ── Derive the citation for the active style ────────────────────────────────
  const result: CitationResult = entry
    ? generateDatasetCitation(entry, activeStyle, lastUpdated)
    : generateCitation(stat!, activeStyle)

  // Derive the source URL for the "View source" link shown below the citation
  const sourceUrl = entry ? entry.sourceUrl : stat!.source.url
  const sourceName = entry ? entry.sourceName : stat!.source.name

  // ── Copy handler ───────────────────────────────────────────────────────────
  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.text)
      } else {
        // Deprecated fallback for HTTP environments
        const textarea = document.createElement('textarea')
        textarea.value = result.text
        textarea.style.position = 'fixed'
        textarea.style.opacity  = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silently fail — the user can still select + copy manually
    }
  }

  return (
    <div className={cn('rounded-xl border border-slate-200 dark:border-slate-700', className)}>

      {/* ── Collapsed trigger ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-4 py-3 text-left',
          'text-sm font-medium text-slate-600 dark:text-slate-300',
          'hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-800/50 dark:hover:text-white',
          'transition-colors',
          isOpen
            ? 'rounded-t-xl border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
            : 'rounded-xl',
        )}
      >
        <span className="flex items-center gap-2">
          <Quote size={14} className="shrink-0 text-slate-400 dark:text-slate-500" />
          Cite this dataset
        </span>
        {isOpen
          ? <ChevronUp size={14} className="shrink-0 text-slate-400" />
          : <ChevronDown size={14} className="shrink-0 text-slate-400" />
        }
      </button>

      {/* ── Expanded panel ────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="flex flex-col gap-3 rounded-b-xl bg-white p-4 dark:bg-slate-900">

          {/* Style tab switcher */}
          <div
            role="tablist"
            aria-label="Citation style"
            className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
          >
            {CITATION_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                role="tab"
                aria-selected={activeStyle === style}
                onClick={() => setActiveStyle(style)}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  activeStyle === style
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                )}
              >
                {CITATION_STYLE_LABELS[style]}
              </button>
            ))}
          </div>

          {/* Citation text block */}
          <div className="relative rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <p
              className="font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-300"
              // The html version wraps the title in <em> and the URL in <a>.
              // It is safe here: we build the HTML ourselves with no user input.
              dangerouslySetInnerHTML={{ __html: result.html }}
            />
          </div>

          {/* Actions row */}
          <div className="flex items-center justify-between gap-3">
            {/* Source link */}
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400"
            >
              <ExternalLink size={11} />
              {sourceName}
            </a>

            {/* Copy button — mirrors ExportButton done/reset pattern */}
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy citation to clipboard"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                copied
                  ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950/30 dark:text-brand-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
            >
              {copied ? (
                <>
                  <Check size={12} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Methodology note — only shown when entry has multiple sources */}
          {entry && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Individual indicators may cite different sources.{' '}
              <a
                href="/methodology"
                className="font-medium text-slate-500 underline underline-offset-2 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
              >
                See methodology
              </a>{' '}
              for full source documentation.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
