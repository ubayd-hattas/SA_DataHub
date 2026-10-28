/**
 * Every story says what period its figures describe and links to the topic page with the current ones.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { STORIES } from '@/data/stories'
import { categories } from '@/data/mock'
import StoryPage from '@/app/insights/[slug]/page'

describe('stories', () => {
  it.each(STORIES.map((s) => [s.slug, s] as const))('%s has a data-as-of note linking to a real topic page', async (slug, story) => {
    expect(story.dataAsOf.note.length).toBeGreaterThan(20)
    expect(story.dataAsOf.note).not.toContain('—')
    expect(categories.map((c) => `/category/${c.id}`)).toContain(story.dataAsOf.topicPath)
    const html = renderToStaticMarkup(await StoryPage({ params: Promise.resolve({ slug }) }))
    expect(html).toContain('Data as of:')
    expect(html).toContain(`href="${story.dataAsOf.topicPath}"`)
  })
})
