/** @type {import('next').NextConfig} */
const nextConfig = {
  // The share image reads the logo from disk; make sure the file ships with that function.
  outputFileTracingIncludes: {
    '/tools/money-value/share-image': ['./public/brand/logo-mark.svg'],
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
