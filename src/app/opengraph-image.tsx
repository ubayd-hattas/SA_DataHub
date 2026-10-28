import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo'

export const runtime = 'edge'
export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '64px',
          background: 'linear-gradient(135deg, #0f172a 0%, #052e1f 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 28, color: '#4ade80', marginBottom: 16, fontWeight: 600 }}>
          {SITE_NAME}
        </div>
        <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.15, maxWidth: 900 }}>
          {SITE_TAGLINE}
        </div>
        <div style={{ fontSize: 24, color: '#94a3b8', marginTop: 32 }}>
          Unemployment · GDP · Crime · Education · Census 2022
        </div>
        <div style={{ fontSize: 20, color: '#64748b', marginTop: 'auto' }}>
          sadatahub.tech
        </div>
      </div>
    ),
    { ...size }
  )
}
