/**
 * The tools of the SA Data Hub MCP server. Each one reads the public API at
 * /api/v1 and passes on the figures together with their source, release date,
 * checked date, terms and credit line, so an assistant cannot get a number
 * without its citation.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export const DEFAULT_BASE = 'https://sadatahub.tech/api/v1'
const TIMEOUT_MS = 15_000
const SERIES_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/

const INSTRUCTIONS =
  'South African official statistics from SA Data Hub. Always give the period, the publisher and the citation or attribution with any figure you use. Follow the terms in each result. A null value means no source document SA Data Hub holds gives that figure: say so, and do not estimate it.'

const text = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] })
const failure = (message) => ({ isError: true, content: [{ type: 'text', text: message }] })

export function createServer({ fetchImpl = fetch, base = DEFAULT_BASE } = {}) {
  const server = new McpServer({ name: 'sa-data-hub', version: '1.0.0' }, { instructions: INSTRUCTIONS })

  async function get(path) {
    const response = await fetchImpl(`${base}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`SA Data Hub answered ${response.status} for ${path}`)
    return response.json()
  }

  /** Runs a tool body, turning any failure into a tool error the assistant can read. */
  const safely = (body) => async (args) => {
    try {
      return await body(args ?? {})
    } catch (error) {
      return failure(`Could not get the data: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  server.registerTool(
    'list_series',
    {
      title: 'List data series',
      description:
        'Lists the South African statistics available, with each id, publisher and dates. Use it to find the id for get_series.',
      inputSchema: {
        search: z.string().max(100).optional().describe('Words to match in the id, title or topic, for example "unemployment"'),
      },
      annotations: { readOnlyHint: true },
    },
    safely(async ({ search }) => {
      const { data, meta } = await get('/series')
      const words = (search ?? '').toLowerCase().split(/\s+/).filter(Boolean)
      const series = data.series.filter((s) => {
        const haystack = `${s.id} ${s.title} ${s.category}`.toLowerCase()
        return words.every((w) => haystack.includes(w))
      })
      return text({ count: series.length, series, attribution: meta.attribution, terms: meta.terms })
    }),
  )

  server.registerTool(
    'get_series',
    {
      title: 'Get one data series',
      description: 'Returns one statistic with its values over time, source, release date, checked date and citation.',
      inputSchema: {
        id: z.string().max(100).regex(SERIES_ID, 'Ids use lower-case letters, numbers and hyphens').describe('An id from list_series'),
        last: z.number().int().min(1).max(500).optional().describe('Return only this many of the newest points'),
      },
      annotations: { readOnlyHint: true },
    },
    safely(async ({ id, last }) => {
      const { data, meta } = await get(`/series/${id}`)
      const points = last ? data.points.slice(-last) : data.points
      return text({
        ...data,
        points,
        pointsInFullSeries: data.points.length,
        attribution: meta.attribution,
        terms: meta.terms,
        estimate: meta.estimate,
      })
    }),
  )

  server.registerTool(
    'get_fuel_prices',
    {
      title: "Get this month's fuel prices",
      description:
        "Returns South Africa's official fuel prices for the latest month, in cents per litre, inland and coastal. Diesel and paraffin are wholesale prices, so pump prices differ.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    safely(async () => {
      const { data, meta } = await get('/fuel/latest')
      return text({ ...data, source: meta.source, checkedOn: meta.checkedOn, attribution: meta.attribution, terms: meta.terms })
    }),
  )

  return server
}
