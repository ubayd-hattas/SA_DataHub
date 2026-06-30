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
    background_color: '#020617',
    theme_color: '#16a34a',
    icons: [
      {
        src: SITE_LOGO_MARK_PATH,
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    id: SITE_URL,
  }
}
