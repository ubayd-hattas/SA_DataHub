import { describe, expect, it } from 'vitest'
import { datasetSchema, explainerArticleSchema, organizationSchema, websiteSchema } from '@/lib/schema'
import { EXPLAINERS } from '@/data/explainers'
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

  it('does not advertise a SearchAction that targets the noindexed dashboard', () => {
    expect(websiteSchema()).not.toHaveProperty('potentialAction')
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

  it('marks up every explainer as an Article that cites its releases', () => {
    for (const explainer of EXPLAINERS) {
      const schema = explainerArticleSchema(explainer)
      expect(schema['@type']).toBe('Article')
      expect(schema.url).toBe(absoluteUrl(`/explainers/${explainer.slug}`))
      expect(schema.datePublished).toBe(explainer.publishedOn)
      expect(schema.isBasedOn).toHaveLength(explainer.sources.length)
      for (const work of schema.isBasedOn) {
        expect(work.name).toBeTruthy()
        expect(work.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    }
  })
})
