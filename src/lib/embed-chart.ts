import { formatLongDate } from '@/lib/explainers'
import { formatSeriesValue, percentDecimals } from '@/lib/format'
import { absoluteUrl } from '@/lib/seo'
import { seriesHref, type SeriesDocument } from '@/lib/series'

/**
 * A standalone HTML page with one series drawn as an inline SVG, for other
 * sites to show in an iframe. No JavaScript: hover values come from SVG
 * <title> elements and the numbers are also in a table for screen readers.
 * Colours are the site tokens from src/app/globals.css, light and dark.
 */

export const EMBED_WIDTH = 640
export const EMBED_HEIGHT = 420
export const embedHref = (id: string) => `/embed/series/${id}`

/** Drawing widths: the wide chart, and a narrow one for frames under 480px so text stays readable. */
export const WIDE = 600
export const NARROW = 340
const H = 240
const PAD = { top: 28, right: 16, bottom: 28, left: 52 }

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Round axis bounds out to whole steps so ticks read 2%, 3%, 4%. */
function niceBounds(min: number, max: number): { lo: number; hi: number; step: number } {
  const range = max - min || Math.abs(max) || 1
  const raw = range / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!
  return { lo: Math.floor(min / step) * step, hi: Math.ceil(max / step) * step, step }
}

/** The chart alone, as an SVG string drawn W units wide. */
export function seriesSvg(doc: SeriesDocument, W: number = WIDE): string {
  const points = doc.points
  const decimals = percentDecimals(points.map((p) => p.value))
  const fmt = (v: number) => formatSeriesValue(v, doc.unit, decimals)
  const values = points.map((p) => p.value)
  const { lo, hi, step } = niceBounds(Math.min(...values), Math.max(...values))
  const x = (i: number) => PAD.left + (points.length === 1 ? (W - PAD.left - PAD.right) / 2 : (i * (W - PAD.left - PAD.right)) / (points.length - 1))
  const y = (v: number) => PAD.top + ((hi - v) * (H - PAD.top - PAD.bottom)) / (hi - lo || 1)

  const grid: string[] = []
  for (let v = lo; v <= hi + step / 1000; v += step) {
    const gy = y(v).toFixed(1)
    grid.push(`<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${gy}" y2="${gy}" class="grid"/>`)
    grid.push(`<text x="${PAD.left - 8}" y="${gy}" dy="4" text-anchor="end" class="axis">${escapeHtml(fmt(Number(v.toFixed(6))))}</text>`)
  }

  const peak = points.reduce((m, p, i) => (p.value > points[m].value ? i : m), 0)
  const labelled = new Set([0, points.length - 1, peak])
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')

  const marks = points
    .map((p, i) => {
      const cx = x(i).toFixed(1)
      const cy = y(p.value).toFixed(1)
      const tip = `<title>${escapeHtml(`${p.period}: ${fmt(p.value)}`)}</title>`
      // A wide invisible target so the hover value is easy to reach.
      const target = `<circle cx="${cx}" cy="${cy}" r="10" class="hit">${tip}</circle>`
      if (!labelled.has(i)) return target
      const isEnd = i === 0 || i === points.length - 1
      const anchor = i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'
      // An end label goes below its point when the line arrives from above, so it doesn't sit on the line.
      const neighbour = points[i === 0 ? 1 : i - 1]
      const below = isEnd && i !== peak && neighbour !== undefined && neighbour.value > p.value
      const ly = below ? Number(cy) + 18 : Number(cy) - 10
      return `${target}<circle cx="${cx}" cy="${cy}" r="4" class="dot"/><text x="${cx}" y="${ly.toFixed(1)}" text-anchor="${anchor}" class="label">${escapeHtml(fmt(p.value))}</text>`
    })
    .join('')

  const first = points[0]
  const last = points.at(-1)!
  const xLabels =
    `<text x="${x(0).toFixed(1)}" y="${H - 6}" text-anchor="start" class="axis">${escapeHtml(first.period)}</text>` +
    (points.length > 1 ? `<text x="${x(points.length - 1).toFixed(1)}" y="${H - 6}" text-anchor="end" class="axis">${escapeHtml(last.period)}</text>` : '')

  const summary = `${doc.title}, ${fmt(first.value)} in ${first.period} to ${fmt(last.value)} in ${last.period}`
  return (
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(`Line chart. ${summary}.`)}" xmlns="http://www.w3.org/2000/svg">` +
    grid.join('') +
    `<path d="${path}" class="line"/>` +
    marks +
    xLabels +
    `</svg>`
  )
}

/** The full embed page. */
export function seriesEmbedHtml(doc: SeriesDocument): string {
  const decimals = percentDecimals(doc.points.map((p) => p.value))
  const fmt = (v: number) => formatSeriesValue(v, doc.unit, decimals)
  const last = doc.points.at(-1)!
  const page = absoluteUrl(seriesHref(doc.id))
  const rows = doc.points.map((p) => `<tr><th scope="row">${escapeHtml(p.period)}</th><td>${escapeHtml(fmt(p.value))}</td></tr>`).join('')
  return `<!doctype html>
<html lang="en-ZA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(doc.title)}, South Africa | SA Data Hub</title>
<link rel="canonical" href="${page}">
<meta name="robots" content="noindex">
<style>
:root{--paper:#faf9f6;--ink:#1b1b19;--muted:#595853;--rule:#e3e1da;--accent:#0f6e56}
@media (prefers-color-scheme:dark){:root{--paper:#131412;--ink:#eceae3;--muted:#a6a59d;--rule:#2c2d2a;--accent:#4fc8a2}}
*{box-sizing:border-box}
body{margin:0;padding:16px;background:var(--paper);color:var(--ink);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
h1{margin:0;font-size:17px;line-height:1.3}
.latest{margin:4px 0 8px;color:var(--muted)}
.latest strong{color:var(--ink);font-size:20px;font-variant-numeric:tabular-nums}
svg{display:block;width:100%;height:auto;overflow:visible}
.grid{stroke:var(--rule);stroke-width:1}
.axis{fill:var(--muted);font-size:11px;font-variant-numeric:tabular-nums}
.line{fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round}
.dot{fill:var(--accent);stroke:var(--paper);stroke-width:2}
.hit{fill:transparent}
.label{fill:var(--ink);font-size:12px;font-weight:600;font-variant-numeric:tabular-nums}
.source{margin:8px 0 0;font-size:12px;color:var(--muted)}
a{color:var(--accent)}
.narrow{display:none}
@media (max-width:479px){.wide{display:none}.narrow{display:block}}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
</style>
</head>
<body>
<h1>${escapeHtml(doc.title)}, South Africa</h1>
<p class="latest"><strong>${escapeHtml(fmt(last.value))}</strong> in ${escapeHtml(last.period)}</p>
<div class="wide">${seriesSvg(doc, WIDE)}</div>
<div class="narrow">${seriesSvg(doc, NARROW)}</div>
<table class="sr"><caption>${escapeHtml(doc.title)}, every value</caption><thead><tr><th scope="col">Period</th><th scope="col">Value</th></tr></thead><tbody>${rows}</tbody></table>
<p class="source">Source: ${escapeHtml(doc.source.publisher)}, ${escapeHtml(doc.source.publication)}, released ${escapeHtml(formatLongDate(doc.source.releasedOn))}. <a href="${page}" target="_blank" rel="noopener">Data and citation on SA Data Hub</a></p>
</body>
</html>
`
}
