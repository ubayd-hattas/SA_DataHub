import type { MetadataRoute } from 'next'
import { SITE_DESCRIPTION, SITE_LOGO_MARK_PATH, SITE_NAME, SITE_URL } from '@/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // Paper background and the logo's green (docs/DESIGN.md).
    background_color: '#faf9f6',
    theme_color: '#198e70',
    icons: [
      {
        src: SITE_LOGO_MARK_PATH,
        sizes: 'any',
        type: 'image/svg+xml',
      },
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    id: SITE_URL,
  }
}
