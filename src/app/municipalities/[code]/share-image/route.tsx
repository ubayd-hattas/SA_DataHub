import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { getAllMunicipalities, getMunicipalityByCode } from '@/data/mock'
import { formatCount, formatPercent } from '@/lib/format'
import { CENSUS_SOURCE } from '@/lib/municipality-profile'

/**
 * "[Name] in numbers": the share image for each municipality page, built at
 * build time like the calculator's. Census 2022 population, households, formal
 * dwellings and flush toilets, with the source. Colours are the light tokens.
 */
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return getAllMunicipalities().map((m) => ({ code: m.id }))
}

const PAPER = '#faf9f6'
const INK = '#1b1b19'
const MUTED = '#595853'
const RULE = '#e3e1da'
const ACCENT = '#0f6e56'

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const m = getMunicipalityByCode((await params).code)
  if (!m) return new Response('Not found', { status: 404 })
  const logo = await readFile(join(process.cwd(), 'public/brand/logo-mark.svg'), 'utf8')
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}`
  const facts = [
    { value: formatCount(m.households2022), label: 'households' },
    { value: formatPercent(m.pctFormalDwelling2022), label: 'in a formal dwelling' },
    { value: formatPercent(m.pctFlushToilet2022), label: 'with a flush toilet' },
  ]

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, color: INK, padding: '56px 72px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={logoSrc} width={72} height={72} style={{ margin: -8 }} />
          <div style={{ fontSize: 30, fontWeight: 700 }}>SA Data Hub</div>
          <div style={{ fontSize: 26, color: MUTED, marginLeft: 'auto' }}>{`${m.provinceName}, ${m.id}`}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', marginBottom: 'auto' }}>
          {/* Satori needs one text node per element, hence the template strings. */}
          <div style={{ fontSize: m.name.length > 22 ? 48 : 60, fontWeight: 700 }}>{`${m.name} in numbers`}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginTop: 20 }}>
            <div style={{ fontSize: 120, fontWeight: 700, color: ACCENT, lineHeight: 1 }}>{formatCount(m.population2022)}</div>
            <div style={{ fontSize: 36 }}>people in Census 2022</div>
          </div>
          <div style={{ display: 'flex', gap: 56, marginTop: 28 }}>
            {facts.map((f) => (
              <div key={f.label} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 44, fontWeight: 700 }}>{f.value}</div>
                <div style={{ fontSize: 24, color: MUTED }}>{f.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', borderTop: `2px solid ${RULE}`, paddingTop: 20, fontSize: 24, color: MUTED }}>
          {`Source: ${CENSUS_SOURCE.publisher}, ${CENSUS_SOURCE.title}. sadatahub.tech/municipalities/${m.id}`}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
