/**
 * src/data/scroll-stories.ts
 *
 * Phase 2 / Phase 3 — Scroll Story Data
 *
 * ScrollStory objects for stories that use the new scroll-driven layout.
 * Each entry's `slug` matches an existing STORIES entry in src/data/stories.ts,
 * so URLs, metadata, and related-story logic all remain unchanged.
 *
 * RULES:
 *  - Do NOT hardcode stat values. The body text may reference real numbers from
 *    the dataset but the live stat callout and chart come from the provider.
 *  - Every statId must exist in a dataset JSON file or the database.
 *  - citationStatIds powers the source attribution row beneath each chapter.
 *
 * To add a new scroll story:
 *  1. Add a ScrollStory object to SCROLL_STORIES.
 *  2. Ensure the slug matches an entry in src/data/stories.ts.
 *  3. Reference real stat IDs in visualization.statId / statCalloutId.
 */

import type { ScrollStory } from '@/types/scroll-story'

// ─── Unemployment Crisis ───────────────────────────────────────────────────────
// Slug: 'south-africa-unemployment-crisis'
// Data: unemployment.json, youth-unemployment.json, labour-force.json
// Series: 16 quarterly points (Q1 2022 – Q4 2025) for unemployment-national
//         16 quarterly points for youth-unemployment-narrow / youth-unemployment-1524
//         24 quarterly points (Q1 2020 – Q4 2025) for lfpr-overall

const unemploymentCrisisStory: ScrollStory = {
  slug: 'south-africa-unemployment-crisis',
  chapters: [
    // ── Chapter 1: The headline number ────────────────────────────────────────
    {
      id: 'scale',
      heading: 'One in three cannot find work',
      body: `South Africa's official unemployment rate stood at 33.6% in Q2 2026 — roughly one in three South Africans who want a job cannot find one. In absolute terms, that is approximately 8.5 million people.

The Quarterly Labour Force Survey (QLFS), published by Statistics South Africa, is the primary source for this data. It uses the narrow definition (LU1): people who are unemployed, have actively looked for work in the past four weeks, and are available to start work immediately.

By any global benchmark, this is a crisis. South Africa's unemployment rate is among the highest for any major economy in the world — and has been for decades.`,
      statCalloutId: 'unemployment-national',
      visualization: {
        type: 'line',
        statId: 'unemployment-national',
        height: 300,
        note: 'Narrow unemployment rate — Q1 2022 to Q2 2026 (QLFS)',
      },
      citationStatIds: ['unemployment-national'],
    },

    // ── Chapter 2: The expanded picture ───────────────────────────────────────
    {
      id: 'expanded',
      heading: 'Beyond the headline: potential labour force',
      body: `The 33.6% official rate captures people who have actively looked for work. But South Africa also has a vast population of "discouraged work-seekers" and persons with an unmet need for employment.

When these jobseekers are included, the combined rate of unemployment and the potential labour force (LU3) reached 43.8% in Q2 2026. Stats SA stopped reporting the former "expanded unemployment rate" after Q2 2025 in favour of the international LU3 standard.

The gap between the official rate and LU3 — over 10 percentage points — reflects the severe structural challenge of the labour market, where millions of potential workers are outside the active search pool.`,
      highlight: 'The combined unemployment and potential labour force rate (LU3) stood at 43.8% in Q2 2026.',
      visualization: {
        type: 'line',
        statId: 'unemployment-national',
        highlightPeriod: 'Q1 2022',
        height: 300,
        note: 'Q1 2022 was the post-pandemic peak: 34.5%',
      },
      citationStatIds: ['unemployment-national'],
    },

    // ── Chapter 3: Youth ──────────────────────────────────────────────────────
    {
      id: 'youth',
      heading: 'Youth: a generation locked out',
      body: `The unemployment crisis is most severe among young South Africans. For those aged 15 to 34, the unemployment rate was 44.8% in Q4 2025. For the narrower 15–24 age group, it reaches 61.4% — more than six in ten young people actively seeking work cannot find it.

Youth unemployment in South Africa is structural, not just cyclical. Even during periods of economic growth, young people without experience, networks, or credentials face near-insurmountable barriers to entering the formal labour market.

The Western Cape, with its more diversified economy and stronger tourism sector, consistently records the lowest youth unemployment among provinces. The Eastern Cape and North West consistently record the highest.`,
      statCalloutId: 'youth-unemployment-narrow',
      highlight: 'Six in ten young South Africans who want work cannot find it.',
      visualization: {
        type: 'line',
        statId: 'youth-unemployment-narrow',
        height: 300,
        note: 'Youth unemployment (narrow), ages 15–34 — quarterly series',
      },
      citationStatIds: ['youth-unemployment-narrow'],
    },

    // ── Chapter 4: The youngest cohort ────────────────────────────────────────
    {
      id: 'youth-1524',
      heading: 'The 15–24 cohort: the sharpest edge',
      body: `Among those aged 15 to 24 specifically, the unemployment rate is the most extreme reading in the dataset. This cohort — school leavers and recent graduates — faces the full weight of the skills mismatch, the credential barrier, and weak demand for entry-level labour.

The NEET rate (Not in Education, Employment, or Training) compounds the picture. A significant share of young South Africans are neither gaining work experience nor improving their skills through study — a structural trap that makes future employment progressively harder to attain.

The 2024 matric pass rate of 87.3% was a record high, but matriculating into an economy that cannot absorb new entrants means that even academic progress does not resolve the underlying structural problem.`,
      statCalloutId: 'youth-unemployment-1524',
      visualization: {
        type: 'line',
        statId: 'youth-unemployment-1524',
        height: 300,
        note: 'Unemployment rate, ages 15–24 — the highest in the series',
      },
      citationStatIds: ['youth-unemployment-1524', 'youth-neet-rate'],
    },

    // ── Chapter 5: Labour force participation ─────────────────────────────────
    {
      id: 'lfpr',
      heading: 'Who is even in the labour force?',
      body: `The labour force participation rate (LFPR) measures the share of the working-age population (15–64) that is either employed or actively looking for work. A low LFPR means large numbers of working-age people are not participating in the formal economy at all.

South Africa's LFPR has remained structurally low by international standards — reflecting the high share of discouraged workers and the large informal economy. Understanding the LFPR is essential context for reading the narrow unemployment rate.

When the LFPR rises, it often temporarily pushes the unemployment rate up — not because fewer people have jobs, but because more discouraged workers have re-entered the market and started searching again. This is why a rising unemployment rate can sometimes be a sign of cautious optimism about job prospects.`,
      statCalloutId: 'lfpr-overall',
      visualization: {
        type: 'line',
        statId: 'lfpr-overall',
        height: 300,
        note: 'Labour force participation rate — Q1 2020 to Q2 2026',
      },
      citationStatIds: ['lfpr-overall'],
    },

    // ── Chapter 6: Where things stand ─────────────────────────────────────────
    {
      id: 'today',
      heading: 'Where things stand today',
      body: `While Q4 2025 (31.4%) was the lowest rate in the recent series, unemployment rose again in 2026 to reach 33.6% in Q2 2026. The number of employed persons stood at 16.7 million, with 8.5 million unemployed.

The economy continues to struggle to generate formal-sector jobs at the scale required. South Africa's working-age population grows by roughly 500,000 people annually, outpacing job absorption.

The SARB has kept interest rates elevated (repo 7.25%) to maintain price stability, while medium-term growth projections remain well below the 5–6% economists say is needed to make a dent in structural unemployment. The gap remains enormous.`,
      statCalloutId: 'unemployment-national',
      highlight: 'At 33.6% in Q2 2026, South Africa\'s unemployment remains among the highest in the world.',
      visualization: {
        type: 'line',
        statId: 'unemployment-national',
        highlightPeriod: 'Q2 2026',
        height: 300,
        note: 'Q2 2026 standing at 33.6%',
      },
      citationStatIds: ['unemployment-national', 'lfpr-overall'],
    },
  ],
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const SCROLL_STORIES: ScrollStory[] = [unemploymentCrisisStory]

export function getScrollStoryBySlug(slug: string): ScrollStory | undefined {
  return SCROLL_STORIES.find((s) => s.slug === slug)
}

/**
 * Returns all stat IDs referenced across a ScrollStory's chapters.
 * Used by the server component to prefetch all needed statistics in one call.
 */
export function getScrollStoryStatIds(story: ScrollStory): string[] {
  const ids = new Set<string>()
  for (const chapter of story.chapters) {
    if (chapter.visualization?.statId) ids.add(chapter.visualization.statId)
    if (chapter.statCalloutId) ids.add(chapter.statCalloutId)
    for (const id of chapter.citationStatIds ?? []) ids.add(id)
  }
  return Array.from(ids)
}
