import { ImageResponse } from 'next/og'
import { formatRand } from '@/lib/format'
import { formatInputRand, moneyValueResult, parseMoneyValueQuery } from '@/lib/money-value'
import { loadLogoDataUri, SHARE_COLORS, SHARE_IMAGE_SIZE, ShareFrame } from '@/lib/share-image'

/** The share image for /tools/money-value?year=&amount=, showing the answer. */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const result = moneyValueResult(parseMoneyValueQuery(params))
  const logoSrc = await loadLogoDataUri()

  return new ImageResponse(
    (
      <ShareFrame
        logoSrc={logoSrc}
        label="What was money worth?"
        footer="Source: Stats SA, CPI headline index, Table B1. sadatahub.tech/tools/money-value"
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', marginBottom: 'auto' }}>
          {/* Satori needs one text node per element, hence the template strings. */}
          <div style={{ fontSize: 44 }}>{`${formatInputRand(result.amount)} in ${result.year} had about the same buying power as`}</div>
          <div style={{ fontSize: 132, fontWeight: 700, color: SHARE_COLORS.accent, lineHeight: 1.1, marginTop: 12 }}>
            {formatRand(result.equivalent, 0)}
          </div>
          <div style={{ fontSize: 44 }}>{`in ${result.nowLabel}.`}</div>
        </div>
      </ShareFrame>
    ),
    {
      ...SHARE_IMAGE_SIZE,
      // Each answer only changes when a new CPI month is added, which needs a deploy anyway.
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    },
  )
}
