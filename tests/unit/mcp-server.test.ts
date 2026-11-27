/**
 * tests/unit/mcp-server.test.ts
 *
 * A real MCP client calls the server. The replies come from the site's own
 * API route handlers, so a change to the API that breaks the tools fails here.
 * No network request is made.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createServer, DEFAULT_BASE } from '../../mcp/sa-data-hub.mjs'
import { GET as listRoute } from '@/app/api/v1/series/route'
import { GET as seriesRoute } from '@/app/api/v1/series/[id]/route'
import { GET as fuelRoute } from '@/app/api/v1/fuel/latest/route'

const requested: string[] = []

async function siteFetch(input: string | URL | Request): Promise<Response> {
  const url = String(input)
  requested.push(url)
  const path = url.slice(DEFAULT_BASE.length)
  if (path === '/series') return listRoute()
  if (path === '/fuel/latest') return fuelRoute()
  const id = /^\/series\/(.+)$/.exec(path)?.[1]
  if (id) return seriesRoute(new Request(url), { params: Promise.resolve({ id }) })
  return new Response('Not found', { status: 404 })
}

const client = new Client({ name: 'test', version: '1.0.0' })

beforeAll(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await createServer({ fetchImpl: siteFetch as typeof fetch }).connect(serverSide)
  await client.connect(clientSide)
})

afterAll(() => client.close())

async function call(name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args })
  const [first] = result.content as { type: string; text: string }[]
  return { isError: result.isError === true, text: first.text }
}

describe('MCP server', () => {
  it('offers three read-only tools', async () => {
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(['get_fuel_prices', 'get_series', 'list_series'])
    for (const t of tools) expect(t.annotations?.readOnlyHint, t.name).toBe(true)
  })

  it('returns a figure with its citation, source and dates', async () => {
    const { isError, text } = await call('get_series', { id: 'cpi-headline', last: 3 })
    expect(isError).toBe(false)
    const body = JSON.parse(text)
    expect(body.points).toHaveLength(3)
    expect(body.pointsInFullSeries).toBeGreaterThan(3)
    expect(body.citation).toContain('https://sadatahub.tech/series/cpi-headline')
    expect(body.source.publisher).toBeTruthy()
    expect(body.source.releasedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(body.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(body.terms).toBeTruthy()
  })

  it('searches the series list', async () => {
    const body = JSON.parse((await call('list_series', { search: 'unemployment' })).text)
    expect(body.count).toBeGreaterThan(0)
    expect(body.series.map((s: { id: string }) => s.id)).toContain('unemployment-national')
  })

  it("passes the fuel prices on with the DMPR's source and terms", async () => {
    const body = JSON.parse((await call('get_fuel_prices')).text)
    expect(body.unit).toBe('cents_per_litre')
    expect(body.attribution).toContain('DMPR')
    expect(body.terms).toBeTruthy()
    expect(body.source.url).toMatch(/^https:/)
  })

  it('reports an unknown id as an error, not an empty answer', async () => {
    const { isError, text } = await call('get_series', { id: 'no-such-series' })
    expect(isError).toBe(true)
    expect(text).toContain('404')
  })

  it('never requests an id that could change the path', async () => {
    const before = requested.length
    for (const id of ['../fuel/latest', 'a/b', 'cpi-headline?x=1', 'https://example.com']) {
      const result = await client.callTool({ name: 'get_series', arguments: { id } }).catch(() => ({ isError: true }))
      expect(result.isError, id).toBe(true)
    }
    expect(requested).toHaveLength(before)
  })
})
