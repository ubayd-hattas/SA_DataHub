import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { formatRand } from '@/lib/format'
import { formatInputRand, moneyValueResult, parseMoneyValueQuery } from '@/lib/money-value'

/**
 * The share image for /tools/money-value?year=&amount=, showing the answer.
 * Colours are the light-theme tokens from docs/DESIGN.md.
 */
const PAPER = '#faf9f6'
const INK = '#1b1b19'
const MUTED = '#595853'
const RULE = '#e3e1da'
const ACCENT = '#0f6e56'

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const result = moneyValueResult(parseMoneyValueQuery(params))
  const logo = await readFile(join(process.cwd(), 'public/brand/logo-mark.svg'), 'utf8')
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}`

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, color: INK, padding: '56px 72px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={logoSrc} width={72} height={72} style={{ margin: -8 }} />
          <div style={{ fontSize: 30, fontWeight: 700 }}>SA Data Hub</div>
          <div style={{ fontSize: 26, color: MUTED, marginLeft: 'auto' }}>What was money worth?</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', marginBottom: 'auto' }}>
          {/* Satori needs one text node per element, hence the template strings. */}
          <div style={{ fontSize: 44 }}>{`${formatInputRand(result.amount)} in ${result.year} had about the same buying power as`}</div>
          <div style={{ fontSize: 132, fontWeight: 700, color: ACCENT, lineHeight: 1.1, marginTop: 12 }}>
            {formatRand(result.equivalent, 0)}
          </div>
          <div style={{ fontSize: 44 }}>{`in ${result.nowLabel}.`}</div>
        </div>
        <div style={{ display: 'flex', borderTop: `2px solid ${RULE}`, paddingTop: 20, fontSize: 24, color: MUTED }}>
          Source: Stats SA, CPI headline index, Table B1. sadatahub.tech/tools/money-value
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // Each answer only changes when a new CPI month is added, which needs a deploy anyway.
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    },
  )
}
