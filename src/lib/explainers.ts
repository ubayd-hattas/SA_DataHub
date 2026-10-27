import { formatDecimal, formatRand } from '@/lib/format'

/**
 * Release explainers: one page per official release (CPI first).
 *
 * Every number shown on an explainer is a SourcedFigure. It names the source
 * document, the table or page it was read from and the date SA Data Hub
 * checked it; the source supplies the release date. assertExplainerSourced()
 * runs when the explainer pages are generated, so `next build` fails if any
 * figure is missing one of these.
 */

export interface ExplainerSource {
  id: string
  publisher: string
  title: string
  /** Name used in short section notes, e.g. "Stats SA P0141". */
  shortName: string
  /** Where and when the maintainer downloaded the file, when recorded. */
  provenance?: string
  /** Release code, e.g. "P0141". */
  code?: string
  /** Date the publisher released the data (ISO yyyy-mm-dd). */
  releasedOn: string
  /** How the release date was established, when the document does not state it. */
  releasedOnNote?: string
  url?: string
  /** The file the figures were checked against. */
  file: string
}

export interface SourcedFigure {
  value: number
  unit: '%' | 'pp' | 'index' | 'R'
  sourceId: string
  /** Where in the source the value appears, e.g. "Table C, page 5". */
  location: string
  /** Date SA Data Hub checked the value against the source (ISO yyyy-mm-dd). */
  checkedOn: string
}

export interface SourcedQuote {
  text: string
  sourceId: string
  location: string
  checkedOn: string
}

export interface Contribution {
  group: string
  previous: SourcedFigure
  current: SourcedFigure
}

export interface RandExample {
  label: string
  amount: number
  thenLabel: string
  nowLabel: string
  indexThen: SourcedFigure
  indexNow: SourcedFigure
  /** The published annual rate the example should agree with. */
  rate: SourcedFigure
}

export interface CoverageItem {
  text: string
  figures?: { label: string; figure: SourcedFigure }[]
  sourceId: string
  location: string
}

export interface CpiExplainer {
  slug: string
  kind: 'cpi'
  /** Reference month, e.g. "September 2026". */
  period: string
  previousPeriod: string
  title: string
  summary: string
  publishedOn: string
  sources: ExplainerSource[]
  headline: {
    annual: SourcedFigure
    previousAnnual: SourcedFigure
    monthly: SourcedFigure
  }
  contributions: Contribution[]
  /** The contributions total row ("All items"). */
  contributionsTotal: Contribution
  /** Sub-group detail quoted alongside the contributions. */
  detail: { label: string; figure: SourcedFigure }[]
  quote: SourcedQuote
  examples: RandExample[]
  coverage: CoverageItem[]
  history: { sourceId: string; checkedOn: string; location: string }
  nextRelease: { period: string; date: string; sourceId: string; location: string }
}

export type Explainer = CpiExplainer

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isSourcedFigure(value: unknown): value is SourcedFigure {
  return typeof value === 'object' && value !== null && 'value' in value && typeof (value as SourcedFigure).value === 'number'
}

/** Every SourcedFigure in an explainer, with its path for error messages. */
export function collectFigures(node: unknown, path = ''): { path: string; figure: SourcedFigure }[] {
  if (isSourcedFigure(node)) return [{ path, figure: node }]
  if (Array.isArray(node)) return node.flatMap((n, i) => collectFigures(n, `${path}[${i}]`))
  if (typeof node === 'object' && node !== null) {
    return Object.entries(node).flatMap(([k, v]) => collectFigures(v, path ? `${path}.${k}` : k))
  }
  return []
}

/** Problems that would leave a figure without a source, release date or checked date. */
export function findSourcingProblems(explainer: Explainer): string[] {
  const problems: string[] = []
  const sources = new Map(explainer.sources.map((s) => [s.id, s]))
  for (const s of explainer.sources) {
    if (!s.publisher || !s.title || !s.shortName || !s.file) problems.push(`source ${s.id}: missing publisher, title, short name or file`)
    if (!ISO_DATE.test(s.releasedOn)) problems.push(`source ${s.id}: missing release date`)
  }
  const refs: { path: string; sourceId: string; location: string; checkedOn?: string }[] = [
    ...collectFigures(explainer).map(({ path, figure }) => ({ path, ...figure })),
    { path: 'quote', ...explainer.quote },
    { path: 'history', ...explainer.history },
    ...explainer.coverage.map((c, i) => ({ path: `coverage[${i}]`, sourceId: c.sourceId, location: c.location, checkedOn: explainer.history.checkedOn })),
    { path: 'nextRelease', ...explainer.nextRelease, checkedOn: explainer.history.checkedOn },
  ]
  for (const ref of refs) {
    if (!sources.has(ref.sourceId)) problems.push(`${ref.path}: unknown source "${ref.sourceId}"`)
    if (!ref.location) problems.push(`${ref.path}: missing location in source`)
    if (!ref.checkedOn || !ISO_DATE.test(ref.checkedOn)) problems.push(`${ref.path}: missing checked date`)
  }
  return problems
}

export function assertExplainerSourced(explainer: Explainer): void {
  const problems = findSourcingProblems(explainer)
  if (problems.length) {
    throw new Error(`Explainer ${explainer.slug} has unsourced figures:\n${problems.join('\n')}`)
  }
}

export function getSource(explainer: Explainer, id: string): ExplainerSource {
  const source = explainer.sources.find((s) => s.id === id)
  if (!source) throw new Error(`Explainer ${explainer.slug}: unknown source "${id}"`)
  return source
}

/** "21 October 2026" from "2026-10-21". */
export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Display a figure the way the site writes numbers (decimal point, not comma). */
export function formatFigure(figure: SourcedFigure): string {
  const n = formatDecimal(figure.value)
  if (figure.unit === '%') return `${n}%`
  if (figure.unit === 'pp') return `${n} ${Math.abs(figure.value) === 1 ? 'point' : 'points'}`
  if (figure.unit === 'R') return formatRand(figure.value, Number.isInteger(figure.value) ? 0 : 2)
  return n
}

export { formatRand }
