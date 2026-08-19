/**
 * src/types/scroll-story.ts
 *
 * Phase 2 — Scroll Story Schema
 *
 * New composable block types for interactive scroll stories.
 * These sit alongside the existing Story / StorySection types in src/types/index.ts.
 *
 * - ScrollStory.slug must match an existing STORIES entry for URL routing
 * - All statIds are resolved via getAppDataProvider() in the server component
 * - No values are hardcoded — data comes from the live stat objects
 */

// ─── Visualization block ──────────────────────────────────────────────────────

/**
 * A chart configuration for a single story chapter.
 * The chart is rendered from the Statistic identified by `statId`.
 */
export interface StoryVisualization {
  /** Chart type — maps to existing LineChartCard or BarChartCard */
  type: 'line' | 'bar'

  /**
   * Statistic ID — resolved via getStatsByIds() in the server component.
   * Must exist in one of the dataset JSON files or the database.
   */
  statId: string

  /**
   * Optional period label to highlight (e.g. "Q1 2022", "Apr 2026").
   * Triggers a ReferenceLine on LineChartCard. Must match a DataPoint.label.
   */
  highlightPeriod?: string

  /** Override the default chart height (default: 300). */
  height?: number

  /** Short caption rendered below the chart. */
  note?: string
}

// ─── Chapter block ────────────────────────────────────────────────────────────

/**
 * A single scroll chapter — one step in the scrollytelling narrative.
 * Each chapter renders:
 *   1. A heading
 *   2. Prose paragraphs (body, split on \n\n)
 *   3. Optional pull quote (highlight)
 *   4. Optional inline stat callout (statCalloutId)
 * On desktop, the visualization panel updates when this chapter becomes active.
 */
export interface StoryChapter {
  /** Unique ID within the story — also used as the scroll step key */
  id: string

  /** Chapter heading (displayed as h2) */
  heading: string

  /**
   * Prose content — paragraphs separated by \n\n.
   * Must not contain hardcoded numbers; reference stat objects instead.
   */
  body: string

  /** Single stat ID to render as an inline live callout below the body */
  statCalloutId?: string

  /** Pull quote / key sentence — displayed as a styled blockquote */
  highlight?: string

  /**
   * Visualization config for this chapter.
   * On desktop: updates the sticky chart panel.
   * On mobile: rendered inline below the narrative.
   */
  visualization?: StoryVisualization

  /**
   * Stat IDs whose sources are shown as citation attribution beneath the chapter.
   * Resolved to Statistic objects server-side — uses the existing citation path.
   */
  citationStatIds?: string[]
}

// ─── Scroll story ─────────────────────────────────────────────────────────────

/**
 * A complete scroll-driven data story.
 * `slug` must match an entry in STORIES (src/data/stories.ts) so that:
 *   - The URL /insights/[slug] remains unchanged
 *   - Metadata, SEO, and related-story links remain intact
 *   - The existing StoryCard and InsightsHub work without modification
 */
export interface ScrollStory {
  /**
   * Slug — matches STORIES[n].slug exactly.
   * The page.tsx uses this to look up the ScrollStory and choose which layout to render.
   */
  slug: string

  /** Ordered chapters — rendered top to bottom in scroll order */
  chapters: StoryChapter[]
}
