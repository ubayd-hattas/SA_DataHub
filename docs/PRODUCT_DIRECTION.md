# SA Data Hub: product direction (updated 28 October 2026)

## Positioning

South Africa's official numbers, explained where you live, with every figure traced to its source.

## Who it is for

People in South Africa who meet a statistic in the news, at school or at work and want to know what it means: students, journalists, teachers, local officials and residents. Search Console, 3 months to 23 Oct 2026: 92% of clicks come from South Africa, and municipality pages bring about 80% of clicks.

## Principles

1. Every figure shows its source, the source's release date and the date SA Data Hub checked it.
2. The "why" comes from the source's own breakdown (for example the contributions table in a Stats SA CPI release), quoted and cited with its page. No speculation and no forecasts.
3. "What it means" is a calculation with its working shown, not an opinion.
4. Plain English, short sentences, no em dashes, no hype.
5. Data is entered by hand from releases the maintainer downloads. No automated requests to Stats SA. Automation and the PostgreSQL migration are paused.
6. AI may draft text, but a person checks every number and sentence against the release before it is published.
7. Corrections are logged publicly.
8. A figure that can't be traced to a release we hold is withheld, with the reason recorded, not shown without a date.
9. New releases go live within 2 working days ([`RUNBOOK.md`](RUNBOOK.md)).

## Pillar 1: release explainers

One page per release, each with the number and how it changed, what moved it in the source's own breakdown, one quoted and cited line, a worked example in rands, what the measure covers and leaves out, and links onward. The homepage leads with "What changed this month".

- **Built:** CPI (September 2026) and QLFS (Q2 2026, with a section on why South Africa publishes more than one unemployment rate). Both have a "Guess first" question.
- **Next:** a template for GDP (quarterly) and one for SARB MPC decisions.

## Pillar 2: your municipality

Municipality pages carry most of the traffic, so they get the most care.

- **Built:**
  - All 213 profiles checked against Census 2022 Provinces at a glance, each figure citing its table and printed page.
  - 2011 and 2022 shown side by side for every municipality. The Municipal fact sheet (page 1) says the 2011 figures were aligned to the 2021 boundaries.
  - "How it compares" with the province and similar places.
  - "Compare with another place" (`/tools/compare`).
  - A share image per municipality.
  - Three related questions on each page.
- **Next:** check the rebuilt municipality page with an automated accessibility test.

## Pillar 3: trust layer

- **Built:**
  - Two dates on every figure.
  - The build-time sourcing check, plus a separate one for explainers.
  - The public corrections log at `/updates`.
  - "Why do the numbers disagree?" on /methodology.
  - Stats SA's reuse condition, quoted on /methodology and added to Stats SA citations.
  - "Report an error" links.
  - A public repository linked from /methodology.
- **Next:** trace or withdraw the remaining unsourced figures on province pages (GDP share, matric, literacy, urban population, legacy expanded rate) and unsourced explanations in the stories.

## Pillar 4: answers

Short pages for questions people search for, chosen from Search Console queries. Each answers in its first sentence (number, period, source), then gives one chart or top-10 list, the working, sources and three related questions. Factual only: no "best" or "safest" rankings and no page per municipality.

- **Built:** 22 pages at `/answers`, linked from the homepage, topic pages, municipality pages, the footer and the header search.
- **Next:** add questions as new queries show up in Search Console.

## Supporting work

- **Done:**
  - Share images (municipality pages, the compare tool, the calculator).
  - schema.org `Dataset` markup with a CSV per dataset.
  - An RSS feed.
  - A header search over places, statistics, answers, explainers, stories and tools.
  - Lighter /dashboard and /provinces bundles (see the case study).
- **Measurement:** page views per page type against the 25 Oct 2026 Search Console baseline. Check whether the Vercel plan supports custom events before relying on them.

## Not now

Translations into African languages (no search demand in the data so far, and any translation would need native-speaker review), new categories, automation, the database migration and a public API.

## Success measures, reviewed monthly

- clicks and click-through from South Africa per page type, against the 25 Oct 2026 baseline
- whether the number of indexed pages recovers from 89 (23 Oct 2026)
- explainer and answer page views and shares
- returning visitors
- messages or links from journalists, teachers or researchers
