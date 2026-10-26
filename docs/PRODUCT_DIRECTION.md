# SA Data Hub: product direction (October 2026)

## Positioning

South Africa's official numbers, explained where you live, with every figure traced to its source.

## Who it is for

People in South Africa who meet a statistic in the news, at school or at work and want to know what it means: students, journalists, teachers, local officials and residents. Search Console, 3 months to 23 Oct 2026: 92% of clicks come from South Africa, and municipality pages bring about 80% of clicks.

## Principles

1. Every figure shows its source, the source's release date and the date SA Data Hub checked it.
2. The "why" comes from the source's own breakdown (for example the contributions table in a Stats SA CPI release), quoted and cited. No speculation and no forecasts.
3. "What it means" is a calculation with its working shown, not an opinion.
4. Plain English, short sentences, no em dashes, no hype.
5. Data is entered by hand from releases the maintainer downloads. No automated requests to Stats SA. Automation and the PostgreSQL migration are paused.
6. AI may draft text, but a person checks every number and sentence against the release before it is published.
7. Corrections are logged publicly.

## Pillar 1: release explainers

One page per release: CPI (monthly), QLFS (quarterly), GDP (quarterly) and SARB MPC decisions. Each page has:

- the number and how it changed
- what moved it, using the source's own breakdown
- one quoted, cited line from the release
- what it means in rands, as a worked example
- what the measure covers and does not cover
- links to the dataset and to earlier explainers

The homepage leads with "What changed this month".

The template is built first on CPI for September 2026. Figures to check against the PDF before use: headline 4.5%, and in Table C transport 1.5 points, housing and utilities 1.3 points, insurance and financial services 0.6 of a point.

## Pillar 2: your municipality

Municipality pages carry most of the traffic, so they get the most care:

- a plain-language summary at the top
- the Census 2011 to 2022 change, shown only where boundaries match, with a boundary note on the 20 codes that do not (see the research notes from 25 Oct 2026)
- comparison with similar municipalities (same province, similar size)
- how province-level figures apply to the place
- titles and descriptions that mention both censuses where 2011 data exists

The 2011 figures need a corrected source attribution before this ships.

## Pillar 3: trust layer

- two dates on every figure: "Source released" and "Checked on SA Data Hub"
- a public corrections log
- a "Why do the numbers disagree?" page: official vs expanded unemployment, LU3 from Q3 2025, mid-year estimates vs census counts
- methodology linked from every chart
- a build-time check that fails if a displayed statistic lacks a source, release date or checked date

## Supporting work

- Share and cite: a stable link per chart and a share image showing the figure and its source.
- schema.org Dataset structured data so datasets can appear in Google Dataset Search.
- An RSS feed of explainers and updates.
- Measurement: page views per page type against the 25 Oct 2026 Search Console baseline. Check whether the Vercel plan supports custom events before relying on them.
- Mobile performance: 39% of impressions are mobile, and the /dashboard and /provinces bundle is about 535 KB.

## Not now

Translations into African languages (no search demand in the data so far, and any translation would need native-speaker review), new categories, automation, the database migration and a public API.

## Success measures, reviewed monthly

- clicks and click-through from South Africa per page type, against the 25 Oct 2026 baseline
- explainer page views and shares
- returning visitors
- messages or links from journalists, teachers or researchers
