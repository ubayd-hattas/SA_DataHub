import { describe, expect, it } from 'vitest'
import { datasetSchema, organizationSchema } from '@/lib/schema'
import { datasetRegistry } from '@/lib/registry'
import { absoluteUrl, SITE_LOGO_PATH } from '@/lib/seo'

describe('structured data', () => {
  it('uses a Google-compatible Place object for dataset spatialCoverage', () => {
    const unemployment = datasetRegistry.find((entry) => entry.id === 'unemployment')
    expect(unemployment).toBeTruthy()

    const schema = datasetSchema(unemployment!, '/category/unemployment')
    expect(schema['@type']).toBe('Dataset')
    expect(schema.spatialCoverage).toMatchObject({
      '@type': 'Place',
      name: 'South Africa',
    })
    expect(schema.spatialCoverage).toHaveProperty('geo')
  })

  it('publishes a crawlable organization logo image object', () => {
    const schema = organizationSchema()
    expect(schema.logo).toEqual({
      '@type': 'ImageObject',
      url: absoluteUrl(SITE_LOGO_PATH),
      width: 512,
      height: 512,
    })
  })
})
