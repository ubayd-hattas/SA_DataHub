/**
 * The "[Name] in numbers" share image: one per municipality, set as the
 * page's Open Graph image, with the census source line.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getAllMunicipalities } from '@/data/mock'
import { generateMetadata } from '@/app/municipalities/[code]/page'
import { GET, generateStaticParams } from '@/app/municipalities/[code]/share-image/route'

describe('municipality share image', () => {
  it('is built for every municipality', () => {
    const codes = generateStaticParams().map((p) => p.code)
    expect(codes).toHaveLength(getAllMunicipalities().length)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('returns 404 for an unknown code', async () => {
    const res = await GET(new Request('http://localhost/municipalities/XX999/share-image'), { params: Promise.resolve({ code: 'XX999' }) })
    expect(res.status).toBe(404)
  })

  it('is the Open Graph image of the municipality page', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ code: 'EC443' }) })
    const images = JSON.stringify(meta.openGraph)
    expect(images).toContain('/municipalities/EC443/share-image')
    expect(images).toContain('in numbers')
  })

  it('shows population, households, two service shares and the source', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/municipalities/[code]/share-image/route.tsx'), 'utf8')
    for (const field of ['population2022', 'households2022', 'pctFormalDwelling2022', 'pctFlushToilet2022', 'CENSUS_SOURCE.title']) {
      expect(src).toContain(field)
    }
    expect(src).toContain('in numbers')
  })
})
