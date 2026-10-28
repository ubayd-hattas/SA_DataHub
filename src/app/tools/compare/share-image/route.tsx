import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { formatCount, formatPercent } from '@/lib/format'
import { parsePlaces } from '@/lib/compare'

/**
 * The share image for /tools/compare?places=…: each place's 2022 population,
 * formal dwellings and flush toilets. Colours are the light-theme tokens.
 */
const PAPER = '#faf9f6'
const INK = '#1b1b19'
const MUTED = '#595853'
const RULE = '#e3e1da'
const ACCENT = '#0f6e56'

export async function GET(request: Request) {
  const places = parsePlaces(Object.fromEntries(new URL(request.url).searchParams))
  const logo = await readFile(join(process.cwd(), 'public/brand/logo-mark.svg'), 'utf8')
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}`

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, color: INK, padding: '56px 72px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={logoSrc} width={72} height={72} style={{ margin: -8 }} />
          <div style={{ fontSize: 30, fontWeight: 700 }}>SA Data Hub</div>
          <div style={{ fontSize: 26, color: MUTED, marginLeft: 'auto' }}>Compare places, Census 2022</div>
        </div>
        <div style={{ display: 'flex', gap: 40, marginTop: 'auto', marginBottom: 'auto' }}>
          {places.length === 0 ? (
            <div style={{ fontSize: 56, fontWeight: 700 }}>Put two or three municipalities side by side</div>
          ) : (
            places.map((m) => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Satori needs one text node per element, hence the template strings. */}
                <div style={{ fontSize: 30, fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 22, color: MUTED }}>{`${m.provinceName}, ${m.id}`}</div>
                <div style={{ fontSize: 56, fontWeight: 700, color: ACCENT, marginTop: 20 }}>{formatCount(m.population2022)}</div>
                <div style={{ fontSize: 22, color: MUTED }}>people</div>
                <div style={{ fontSize: 24, marginTop: 16 }}>{`${formatPercent(m.pctFormalDwelling2022)} formal dwellings`}</div>
                <div style={{ fontSize: 24 }}>{`${formatPercent(m.pctFlushToilet2022)} flush toilets`}</div>
              </div>
            ))
          )}
        </div>
        <div style={{ display: 'flex', borderTop: `2px solid ${RULE}`, paddingTop: 20, fontSize: 24, color: MUTED }}>
          Source: Stats SA, Census 2022 Provinces at a glance. sadatahub.tech/tools/compare
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } },
  )
}
