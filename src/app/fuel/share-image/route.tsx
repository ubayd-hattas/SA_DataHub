import { ImageResponse } from 'next/og'
import { FUEL_PUBLISHER, latestAdjustment } from '@/lib/fuel'
import { calculateFuelCost, parseShareQuery, shareImageQuery } from '@/lib/fuel-calc'
import { changeText, litresText, rands, selectionText, workingText } from '@/lib/fuel-calc-text'
import { loadLogoDataUri, SHARE_COLORS, SHARE_IMAGE_SIZE, ShareFrame } from '@/lib/share-image'

/** Cached for a day in browsers and a week on the CDN. The answer only changes when a new month's prices are deployed. */
const CACHE = 'public, max-age=86400, s-maxage=604800'

/**
 * The share image for /fuel?litres=&product=&zone=, showing the cost.
 * Product and zone must be on the fixed lists and litres must be ones the
 * calculator accepts (1 to 1000, two decimals at most). Anything else is a 400.
 * Every answer has one address (litres, product, zone, in that order, as the
 * page links it). Other spellings of the same answer, such as litres=045 or
 * extra parameters, redirect to it, so each answer is drawn and cached once.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = parseShareQuery(Object.fromEntries(url.searchParams))
  if (!query.ok) {
    return new Response(query.error, { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
  }
  const canonical = shareImageQuery(query)
  if (url.search !== `?${canonical}`) {
    return new Response(null, { status: 308, headers: { Location: `${url.pathname}?${canonical}`, 'Cache-Control': CACHE } })
  }
  const result = calculateFuelCost({ litres: query.litres, product: query.product, zone: query.zone })
  if (!result.ok) {
    return new Response('No price for that choice.', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
  }
  const logoSrc = await loadLogoDataUri()
  const change = changeText(result)

  return new ImageResponse(
    (
      <ShareFrame
        logoSrc={logoSrc}
        label="What would a tank cost?"
        footer={`Source: ${FUEL_PUBLISHER.shortName}, ${latestAdjustment().source.document.split(' (')[0]}. sadatahub.tech/fuel`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', marginBottom: 'auto' }}>
          {/* Satori needs one text node per element, hence the template strings. */}
          <div style={{ fontSize: 44 }}>{`${litresText(result.litres)}: ${selectionText(result)}`}</div>
          <div style={{ fontSize: 132, fontWeight: 700, color: SHARE_COLORS.accent, lineHeight: 1.1, marginTop: 12 }}>
            {rands(result.costCents)}
          </div>
          <div style={{ fontSize: 40 }}>{workingText(result)}</div>
          {change && <div style={{ fontSize: 34, color: SHARE_COLORS.muted, marginTop: 8 }}>{change}</div>}
        </div>
      </ShareFrame>
    ),
    { ...SHARE_IMAGE_SIZE, headers: { 'Cache-Control': CACHE } },
  )
}
