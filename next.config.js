/** @type {import('next').NextConfig} */
const nextConfig = {
  // The share image reads the logo from disk; make sure the file ships with that function.
  outputFileTracingIncludes: {
    '/tools/money-value/share-image': ['./public/brand/logo-mark.svg'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
        ],
      },
      // Pages may not be framed by other sites. /embed/* is excluded: those
      // pages exist to be framed and set their own frame-ancestors policy.
      {
        source: '/((?!embed/).*)',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
    ]
  },
  async redirects() {
    return [
      // The Matric 2024 story was retired: its provincial figures could not be traced to a held release.
      { source: '/insights/matric-results-2024', destination: '/insights/matric-results-2025', permanent: true },
      // Canonical host: apex domain (non-www), matching ubayd.me pattern
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.sadatahub.tech' }],
        destination: 'https://sadatahub.tech/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
