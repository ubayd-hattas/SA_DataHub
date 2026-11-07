import { ImageResponse } from 'next/og'
import { formatCount, formatPercent } from '@/lib/format'
import { parsePlaces } from '@/lib/compare'
import { loadLogoDataUri, SHARE_COLORS, SHARE_IMAGE_SIZE, ShareFrame } from '@/lib/share-image'

/**
 * The share image for /tools/compare?places=…: each place's 2022 population,
 * formal dwellings and flush toilets.
 */
export async function GET(request: Request) {
  const places = parsePlaces(Object.fromEntries(new URL(request.url).searchParams))
  const logoSrc = await loadLogoDataUri()
  const { muted, accent } = SHARE_COLORS

  return new ImageResponse(
    (
      <ShareFrame
        logoSrc={logoSrc}
        label="Compare places, Census 2022"
        footer="Source: Stats SA, Census 2022 Provinces at a glance. sadatahub.tech/tools/compare"
      >
        <div style={{ display: 'flex', gap: 40, marginTop: 'auto', marginBottom: 'auto' }}>
          {places.length === 0 ? (
            <div style={{ fontSize: 56, fontWeight: 700 }}>Put two or three municipalities side by side</div>
          ) : (
            places.map((m) => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Satori needs one text node per element, hence the template strings. */}
                <div style={{ fontSize: 30, fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 22, color: muted }}>{`${m.provinceName}, ${m.id}`}</div>
                <div style={{ fontSize: 56, fontWeight: 700, color: accent, marginTop: 20 }}>{formatCount(m.population2022)}</div>
                <div style={{ fontSize: 22, color: muted }}>people</div>
                <div style={{ fontSize: 24, marginTop: 16 }}>{`${formatPercent(m.pctFormalDwelling2022)} formal dwellings`}</div>
                <div style={{ fontSize: 24 }}>{`${formatPercent(m.pctFlushToilet2022)} flush toilets`}</div>
              </div>
            ))
          )}
        </div>
      </ShareFrame>
    ),
    { ...SHARE_IMAGE_SIZE, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } },
  )
}
