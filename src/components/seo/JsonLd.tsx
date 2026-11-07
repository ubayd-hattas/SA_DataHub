import { serializeJsonLd } from '@/lib/schema'

/**
 * Renders one or more JSON-LD structured data blocks.
 * Pass plain schema.org objects from src/lib/schema.ts.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const blocks = Array.isArray(data) ? data : [data]
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(block) }}
        />
      ))}
    </>
  )
}
