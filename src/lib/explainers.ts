import { formatCount, formatDecimal, formatRand } from '@/lib/format'

/**
 * Release explainers: one page per official release (CPI, then QLFS).
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
  /** 'thousand' is a count published in thousands, as in the QLFS. */
  unit: '%' | 'pp' | 'index' | 'R' | 'thousand'
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

/** A labour force measure with the three quarters the release tables give. */
export interface QuarterRow {
  label: string
  yearAgo: SourcedFigure
  previous: SourcedFigure
  current: SourcedFigure
}

export interface UnderutilisationRate extends QuarterRow {
  code: 'LU1' | 'LU2' | 'LU3' | 'LU4'
  /** Stats SA's own wording for what the rate measures. */
  definition: SourcedQuote
}

export interface QlfsExplainer {
  slug: string
  kind: 'qlfs'
  /** Topic page this explainer belongs to. */
  categoryId: string
  /** "Q2 2026" */
  period: string
  /** "April to June 2026" */
  periodMonths: string
  previousPeriod: string
  yearAgoPeriod: string
  title: string
  summary: string
  publishedOn: string
  sources: ExplainerSource[]
  headline: {
    rate: SourcedFigure
    previousRate: SourcedFigure
    yearAgoRate: SourcedFigure
    quarterChange: SourcedFigure
    yearChange: SourcedFigure
  }
  /** Table A counts, in thousands. */
  counts: (QuarterRow & { quarterChange: SourcedFigure })[]
  /** The release's own sentence on what moved the rate. */
  reason: SourcedQuote
  quote: SourcedQuote
  rates: UnderutilisationRate[]
  /** The release's reason for publishing the other rates. */
  ratesReason: SourcedQuote
  /** The release's line on reading the rates together. */
  ratesNote: SourcedQuote
  definitions: { term: string; text: SourcedQuote }[]
  coverage: CoverageItem[]
  nextRelease: { period: string; month: string; sourceId: string; location: string }
}

export type Explainer = CpiExplainer | QlfsExplainer

export const isCpi = (e: Explainer): e is CpiExplainer => e.kind === 'cpi'
export const isQlfs = (e: Explainer): e is QlfsExplainer => e.kind === 'qlfs'

/** The figure an explainer leads with, and the one it is compared with. */
export function headlineFigures(e: Explainer): { current: SourcedFigure; previous: SourcedFigure; label: string; previousPeriod: string } {
  return isCpi(e)
    ? { current: e.headline.annual, previous: e.headline.previousAnnual, label: 'Annual inflation', previousPeriod: e.previousPeriod }
    : { current: e.headline.rate, previous: e.headline.previousRate, label: 'Official unemployment rate', previousPeriod: e.previousPeriod }
}

/** "Consumer prices" or "Unemployment", for cards and kickers. */
export function explainerTopic(e: Explainer): string {
  return isCpi(e) ? 'Consumer prices' : 'Unemployment'
}

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

/** Every quote-like reference (text, source, location, checked date) in an explainer. */
function collectQuotes(node: unknown, path = ''): { path: string; quote: SourcedQuote }[] {
  if (typeof node === 'object' && node !== null && !Array.isArray(node) && 'text' in node && 'sourceId' in node && 'checkedOn' in node) {
    return [{ path, quote: node as SourcedQuote }]
  }
  if (Array.isArray(node)) return node.flatMap((n, i) => collectQuotes(n, `${path}[${i}]`))
  if (typeof node === 'object' && node !== null) {
    return Object.entries(node).flatMap(([k, v]) => collectQuotes(v, path ? `${path}.${k}` : k))
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
  const checked = headlineFigures(explainer).current.checkedOn
  const refs: { path: string; sourceId: string; location: string; checkedOn?: string }[] = [
    ...collectFigures(explainer).map(({ path, figure }) => ({ path, ...figure })),
    ...collectQuotes(explainer).map(({ path, quote }) => ({ path, ...quote })),
    ...explainer.coverage.map((c, i) => ({ path: `coverage[${i}]`, sourceId: c.sourceId, location: c.location, checkedOn: checked })),
    { path: 'nextRelease', ...explainer.nextRelease, checkedOn: checked },
  ]
  if (isCpi(explainer)) refs.push({ path: 'history', ...explainer.history })
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
  if (figure.unit === 'thousand') {
    // Published in thousands: 8 481 is 8.5 million; 345 is 345 000.
    const abs = Math.abs(figure.value)
    const sign = figure.value < 0 ? '-' : ''
    return abs >= 1000 ? `${sign}${formatDecimal(abs / 1000)} million` : `${sign}${formatCount(abs * 1000)}`
  }
  return n
}

export { formatRand }
