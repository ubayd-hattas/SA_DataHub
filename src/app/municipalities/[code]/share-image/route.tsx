import { ImageResponse } from 'next/og'
import { getAllMunicipalities, getMunicipalityByCode } from '@/data/mock'
import { formatCount, formatPercent } from '@/lib/format'
import { CENSUS_SOURCE } from '@/lib/municipality-profile'
import { loadLogoDataUri, SHARE_COLORS, SHARE_IMAGE_SIZE, ShareFrame } from '@/lib/share-image'

/**
 * "[Name] in numbers": the share image for each municipality page, built at
 * build time like the calculator's. Census 2022 population, households, formal
 * dwellings and flush toilets, with the source.
 */
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return getAllMunicipalities().map((m) => ({ code: m.id }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const m = getMunicipalityByCode((await params).code)
  if (!m) return new Response('Not found', { status: 404 })
  const logoSrc = await loadLogoDataUri()
  const facts = [
    { value: formatCount(m.households2022), label: 'households' },
    { value: formatPercent(m.pctFormalDwelling2022), label: 'in a formal dwelling' },
    { value: formatPercent(m.pctFlushToilet2022), label: 'with a flush toilet' },
  ]

  return new ImageResponse(
    (
      <ShareFrame
        logoSrc={logoSrc}
        label={`${m.provinceName}, ${m.id}`}
        footer={`Source: ${CENSUS_SOURCE.publisher}, ${CENSUS_SOURCE.title}. sadatahub.tech/municipalities/${m.id}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', marginBottom: 'auto' }}>
          {/* Satori needs one text node per element, hence the template strings. */}
          <div style={{ fontSize: m.name.length > 22 ? 48 : 60, fontWeight: 700 }}>{`${m.name} in numbers`}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginTop: 20 }}>
            <div style={{ fontSize: 120, fontWeight: 700, color: SHARE_COLORS.accent, lineHeight: 1 }}>{formatCount(m.population2022)}</div>
            <div style={{ fontSize: 36 }}>people in Census 2022</div>
          </div>
          <div style={{ display: 'flex', gap: 56, marginTop: 28 }}>
            {facts.map((f) => (
              <div key={f.label} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 44, fontWeight: 700 }}>{f.value}</div>
                <div style={{ fontSize: 24, color: SHARE_COLORS.muted }}>{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </ShareFrame>
    ),
    SHARE_IMAGE_SIZE,
  )
}
