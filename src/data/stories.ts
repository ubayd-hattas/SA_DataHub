/**
 * src/data/stories.ts
 *
 * SA Data Hub — Insights Hub story content.
 *
 * Stories are long-form narratives that explain what the data means.
 * They are authored manually and updated when major data releases warrant it.
 *
 * To add a story:
 *   1. Add a Story object to the STORIES array below.
 *   2. Reference Statistic IDs in relatedStatIds and section.statCallouts.
 *   3. The story is automatically indexed by the search engine.
 */

import { Story } from '@/types'

export const STORIES: Story[] = [
  // ── Story 1: Unemployment ──────────────────────────────────────────────────
  {
    slug: 'south-africa-unemployment-crisis',
    title: 'Unemployment in South Africa: what the latest survey shows',
    subtitle: 'A third of the labour force had no work from April to June 2026. The official figures, by measure, age and province.',
    category: 'unemployment',
    categoryLabel: 'Unemployment',
    readingTimeMinutes: 4,
    publishedDate: '2026-01-15',
    lastUpdated: '2026-11-09',
    featured: true,
    coverEmoji: '📉',
    summary:
      "The official unemployment rate was 33.6% from April to June 2026, or 8.5 million people. For people aged 15 to 24 it was 62.8%. Every figure here is from Stats SA's Quarterly Labour Force Survey, with its table and page.",
    relatedStatIds: ['unemployment-national', 'youth-unemployment-narrow', 'lfpr-overall'],
    relatedSlugs: ['inflation-what-it-means', 'gdp-growth-slowdown'],
    tags: ['unemployment', 'labour market', 'youth', 'QLFS'],
    dataAsOf: {
      note: 'The figures here are from the labour force survey for April to June 2026 (Q2), except the NEET rate, which is for Q4 2025.',
      topicPath: '/category/unemployment',
      topicLabel: 'Unemployment',
    },
    sections: [
      {
        id: 'scale',
        heading: 'One in three in the labour force',
        body: "Stats SA's Quarterly Labour Force Survey for April to June 2026 put the official unemployment rate at 33.6%, up from 32.7% in the first quarter. That is 8 481 000 unemployed people in a labour force of 25 220 000 (Table A, page 1).\n\nStats SA gives the reason in one sentence: \"A decrease in employment and an increase in unemployment resulted in an increase of 0,9 of a percentage point in the unemployment rate to 33,6% in the second quarter of 2026.\" (Highlights of the results, page 2)",
        statCallouts: ['unemployment-national'],
        highlight: '8 481 000 people were unemployed from April to June 2026.',
      },
      {
        id: 'wider-measures',
        heading: 'The wider measures',
        body: 'The official rate only counts people who looked for work and could start. Adding the 4 571 000 people in the potential labour force, who want work but did not look or could not start yet, gives the LU3 rate: 43.8% (Table E, page 7). Among them were 3 665 000 discouraged job-seekers, people who stopped looking because they believe there is no work for them (Table A, page 1).\n\nStats SA publishes four of these rates and says they should be read together. The page on why the numbers disagree sets them side by side.',
        highlight: 'With the potential labour force included, the rate was 43.8%.',
      },
      {
        id: 'youth',
        heading: 'Young people',
        body: 'For people aged 15 to 24, the unemployment rate was 62.8% (Table 2.2, page 26). For ages 15 to 34 it was 47.4%, which SA Data Hub calculated from the 15 to 24 and 25 to 34 rows of the same table (pages 26 and 27).\n\nA second measure looks beyond the labour force: the share of young people not in employment, education or training. It was 34.0% of people aged 15 to 24 in the fourth quarter of 2025 (QLFS Q4 2025, section 4.2, page 8).',
        statCallouts: ['youth-unemployment-narrow'],
        highlight: 'For people aged 15 to 24, the rate was 62.8%.',
      },
      {
        id: 'provinces',
        heading: 'Provinces',
        body: 'The official rate ranged from 19.5% in the Western Cape to 47.5% in the Eastern Cape (Table E, page 7). The Northern Cape (28.7%), Limpopo (32.0%) and KwaZulu-Natal (32.5%) were also below the national 33.6%. Gauteng (34.6%), Mpumalanga (36.6%), the Free State (37.3%) and North West (38.1%) were above it.',
      },
      {
        id: 'jobs',
        heading: 'Jobs',
        body: 'The number of employed people fell by 16 000 in the quarter, to 16 739 000 (Table A, page 1). Compared with a year earlier, the working-age population grew by 488 000 while employment fell by 68 000 (Table A, page 1).',
        statCallouts: ['lfpr-overall'],
      },
    ],
  },

  // ── Story 2: Inflation ─────────────────────────────────────────────────────
  {
    slug: 'inflation-what-it-means',
    title: 'Inflation: What the Numbers Actually Mean for South Africans',
    subtitle: 'CPI hit a 21-year low in 2025 — but does lower inflation mean life is getting cheaper?',
    category: 'inflation',
    categoryLabel: 'Inflation and prices',
    readingTimeMinutes: 5,
    publishedDate: '2026-02-10',
    lastUpdated: '2026-10-23',
    featured: true,
    coverEmoji: '🛒',
    summary: 'South Africa\'s annual average inflation hit 3.2% in 2025, the lowest in 21 years. The headline number suggests relief, but food prices, electricity tariffs, and interest rates still squeeze millions of households.',
    relatedStatIds: ['cpi-headline', 'food-inflation', 'repo-rate-sarb', 'annual-cpi-avg'],
    relatedSlugs: ['south-africa-unemployment-crisis', 'gdp-growth-slowdown'],
    tags: ['inflation', 'CPI', 'SARB', 'interest rates', 'food prices'],
    dataAsOf: { note: "Monthly figures here run to September 2026. Inflation is published every month, so check the Inflation page for the latest rate.", topicPath: '/category/inflation', topicLabel: 'Inflation and prices' },
    sections: [
      {
        id: 'what-is-cpi',
        heading: 'What CPI measures — and what it misses',
        body: 'The Consumer Price Index (CPI) measures the average change in prices paid by urban South African households for a fixed basket of goods and services. Stats SA collects data from thousands of outlets across the country each month.\n\nThe basket is weighted to reflect how the average urban household spends money. Housing and utilities account for the largest weight (around 24%), followed by food and non-alcoholic beverages (17%), transport (15%), and miscellaneous goods and services (14%).\n\nThis weighting matters. A household that spends a larger-than-average share of income on food — as lower-income households typically do — will experience inflation differently from the headline figure. When food inflation was above 14% in early 2023, the effective inflation rate for poor households was significantly higher than the headline CPI.',
        highlight: 'The "average" inflation rate can mask very different experiences across income groups.',
      },
      {
        id: '2025-story',
        heading: 'Why 2025 was a low-inflation year',
        body: 'South Africa\'s annual average CPI fell to 3.2% in 2025 — the lowest full-year average since 2004. Several factors converged.\n\nGlobal commodity prices, which had spiked after Russia\'s invasion of Ukraine in 2022, normalised significantly. Fuel prices fell as oil prices moderated. Food inflation, which had been running above 14% in early 2023, eased dramatically as global grain prices retreated and the rand stabilised.\n\nThe SARB\'s aggressive rate hiking cycle — which took the repo rate from 3.5% in late 2021 to 8.25% by mid-2023 — had its intended effect: demand-pull inflation was squeezed out of the economy. The cost, however, was significant: higher borrowing costs weighed on economic growth and on mortgage-holders.\n\nThe good news is that the SARB had been easing rates until early 2026, though upside inflation pressures subsequently prompted hikes to 7.00% in May and 7.25% in September 2026.',
        statCallouts: ['annual-cpi-avg', 'repo-rate-sarb'],
      },
      {
        id: 'food-prices',
        heading: 'Food inflation: the numbers households feel most',
        body: 'Food prices are the inflation measure most South Africans feel most viscerally. When meat, bread, and cooking oil become more expensive, the impact is immediate and unavoidable — especially for the 40% of households who spend more than 40% of income on food.\n\nFood CPI peaked at 14% in early 2023. By September 2026 it had eased to 1.2% — one of the lowest readings in years. The improvement reflects lower global grain prices, a stronger rand, and strong domestic agricultural output.\n\nHowever, absolute prices have not fallen — they have simply stopped rising as fast. The cumulative price increase since 2021 means the food basket still costs significantly more in rand terms than it did before the inflation surge.',
        statCallouts: ['food-inflation'],
        highlight: 'Lower inflation means prices are rising more slowly — not that prices have fallen.',
      },
      {
        id: 'mid-2026-rebound',
        heading: 'The mid-2026 rebound: inflation rises toward 5%',
        body: 'After a period of easing, inflation accelerated in mid-2026. Headline CPI rose to 4.0% in April and peaked at 5.0% in June before moderating to 4.5% in September 2026.\n\nThe primary culprits were fuel prices, electricity tariffs, and municipal service adjustments. Transport CPI swung into positive territory as global oil and domestic petrol prices climbed, while Eskom\'s annual tariff adjustment pushed housing and utility costs higher.\n\nIn response to persistent upside risks, the SARB raised the repo rate to 7.00% in May 2026 and further to 7.25% in September 2026, maintaining a vigilant stance on its 3% target.',
        statCallouts: ['cpi-headline'],
      },
    ],
  },

  // ── Story 3: GDP ────────────────────────────────────────────────────────────
  {
    slug: 'gdp-growth-slowdown',
    title: 'SA\'s Economy: Growing, But Not Fast Enough',
    subtitle: 'GDP grew 1.1% in 2025 — the best in three years. Why that is both encouraging and deeply insufficient.',
    category: 'economy',
    categoryLabel: 'GDP and economy',
    readingTimeMinutes: 6,
    publishedDate: '2026-03-15',
    lastUpdated: '2026-10-23',
    featured: false,
    coverEmoji: '📊',
    summary: 'South Africa\'s economy grew 1.1% in 2025, its strongest performance since 2022. This story explains the gap between what is happening and what is needed.',
    relatedStatIds: ['gdp-growth', 'gdp-annual-growth', 'gdp-nominal'],
    relatedSlugs: ['south-africa-unemployment-crisis', 'inflation-what-it-means'],
    tags: ['GDP', 'economic growth', 'Stats SA', 'load shedding'],
    dataAsOf: { note: "Quarterly figures here run to Q2 2026. GDP is published every quarter, so check the GDP page for the latest figure.", topicPath: '/category/gdp', topicLabel: 'GDP and economy' },
    sections: [
      {
        id: 'recent-gdp',
        heading: 'Recent GDP trajectory',
        body: 'After six consecutive quarters of expansion through Q1 2026 (+0.4%), real GDP contracted by 0.2% quarter-on-quarter in Q2 2026 (seasonally adjusted, constant 2015 prices). Mining (-3.0%), trade (-1.9%), and manufacturing (-1.8%) were the main drags, while finance (+0.3%) and personal services (+0.6%) showed modest growth.\n\nFor the full year 2025, GDP rose 1.1%. That was the highest annual growth rate since 2022, but the Q2 2026 contraction highlights the ongoing fragility of the recovery ahead of Stats SA\'s planned national accounts rebasing.',
        statCallouts: ['gdp-growth', 'gdp-annual-growth'],
        highlight: 'A 0.2% contraction in Q2 2026 ended six quarters of expansion, underscoring how fragile growth remains.',
      },
      {
        id: 'not-enough',
        heading: 'Why 1.1% is not enough',
        body: 'South Africa\'s population grows by roughly 1% per year. That means GDP must grow by at least 1% just to keep GDP per capita flat. At 1.1%, 2025 growth barely kept the country\'s head above water on a per-capita basis.\n\nSouth Africa has not grown above 3% since 2011 — more than a decade of sustained underperformance. Over that period, the economy grew at an average of around 1% per year in real terms.',
      },
      {
        id: 'what-held-back',
        heading: 'What held the economy back',
        body: 'Load-shedding — scheduled electricity outages — inflicted billions of rands of economic damage each year from 2022 to 2024. The situation improved significantly from late 2024 as Eskom\'s maintenance programme bore fruit and new renewable energy capacity came online. But load-shedding has not been eliminated, and its legacy damage to business confidence and investment takes time to repair.\n\nLogistics constraints also remain severe. Transnet, the state freight rail and ports company, has struggled with operational problems, theft of infrastructure, and deferred maintenance. Mining and agricultural exporters — the backbone of South Africa\'s current account — have been particularly hard hit.\n\nManufacturing recorded its second consecutive year of negative growth in 2025. Construction posted its ninth straight year of decline. Both sectors are critical for labour-intensive job creation.',
      },
      {
        id: 'bright-spots',
        heading: 'Bright spots and reasons for cautious optimism',
        body: 'Agriculture had a strong 2025, boosted by good rains and improved horticulture output. Finance and business services continued to expand. Tourism has recovered strongly from the post-pandemic trough.\n\nPerhaps most significantly, South Africa was removed from the Financial Action Task Force (FATF) grey list in late 2024 — a development that should, over time, reduce compliance costs for South African businesses operating internationally and improve access to foreign capital.\n\nSovereign credit rating agencies have also taken note of improved fiscal discipline. Moody\'s and S&P both cited better-than-expected fiscal consolidation in their mid-2025 reviews, though South Africa\'s rating remains sub-investment grade.',
        statCallouts: ['gdp-nominal'],
      },
    ],
  },

  // ── Story 4: Crime ─────────────────────────────────────────────────────────
  {
    slug: 'understanding-crime-statistics',
    title: 'Understanding South Africa\'s Crime Statistics',
    subtitle: 'What the SAPS numbers actually show, what they hide, and why context is everything.',
    category: 'crime',
    categoryLabel: 'Crime',
    readingTimeMinutes: 5,
    publishedDate: '2025-11-01',
    lastUpdated: '2025-11-01',
    featured: false,
    coverEmoji: '🔍',
    summary: 'South Africa recorded 26,232 murders in 2023/24, a decline from the prior year\'s peak. But crime statistics are complex documents. This story explains what they measure, what they miss, and how to read them critically.',
    relatedStatIds: ['murder-rate', 'crime-contact', 'crime-robbery'],
    relatedSlugs: ['south-africa-unemployment-crisis'],
    tags: ['crime', 'SAPS', 'murder', 'contact crime'],
    dataAsOf: { note: "This story uses the SAPS annual figures for 2023/24, which are still the latest annual figures on SA Data Hub.", topicPath: '/category/crime', topicLabel: 'Crime' },
    sections: [
      {
        id: 'what-saps-publishes',
        heading: 'What SAPS actually publishes',
        body: 'Each September, the South African Police Service releases crime statistics covering the April-to-March financial year. The data covers crimes reported to police — which is not the same as crimes committed.\n\nUnder-reporting is a persistent issue. Surveys suggest that many crimes, particularly sexual offences, domestic violence, and theft, are significantly under-reported. Fear of police, social stigma, lack of transport to a police station, and low faith in the criminal justice system all reduce reporting rates.\n\nWith that caveat in mind, the SAPS data is the most comprehensive official record available and remains the essential reference point for tracking trends over time.',
        highlight: 'Crime statistics count crimes reported to police — not crimes committed.',
      },
      {
        id: 'murder',
        heading: 'Murder: the most reliable indicator',
        body: 'This story looks at murder first. The 2023/24 figure of 26,232 murders — a 4.6% decline from the 27,494 in 2022/23 — is therefore meaningful.\n\nThis equates to approximately 72 murders per day, or a rate of 41.9 per 100,000 population. For context, the global average is around 6 per 100,000. South Africa\'s rate is more than six times higher.\n\nGauteng, KwaZulu-Natal, and the Western Cape account for the majority of murders. The Cape Flats area of Cape Town — plagued by gang violence — has been a persistent hotspot. The SAPS has deployed the military in several Western Cape communities in recent years as part of anti-gang operations.',
        statCallouts: ['murder-rate'],
      },
      {
        id: 'contact-crime',
        heading: 'Contact crime and what drives it',
        body: 'Contact crimes — those involving physical contact between perpetrator and victim, including assault, robbery, and murder — totalled 561,947 in 2023/24. This was a 4% decline from 2022/23 and the first reduction in several years.\n\nRobbers with aggravating circumstances — carjackings, house robberies, bank robberies — declined 3.1% to 162,618 cases. This is a category that particularly affects middle-class and business communities and tends to receive significant media attention.\n\nResearch consistently links crime levels to unemployment, inequality, poverty, and weak state capacity. South Africa scores highly on all these risk factors, which is why its crime rates remain elevated even during periods of improving economic conditions.',
        statCallouts: ['crime-contact', 'crime-robbery'],
      },
    ],
  },

  // ── Story 5: Education ─────────────────────────────────────────────────────
  {
    slug: 'matric-results-2025',
    title: 'Matric 2025: 88.0% passed, and 345 857 qualified for a degree',
    subtitle: 'What the Department of Basic Education\'s 2025 report shows about passes, provinces and mathematics.',
    category: 'education',
    categoryLabel: 'Education',
    readingTimeMinutes: 4,
    publishedDate: '2026-11-07',
    lastUpdated: '2026-11-07',
    featured: false,
    coverEmoji: '🎓',
    summary: '746 110 full-time candidates wrote the 2025 National Senior Certificate and 87.98% passed, up from 87.26% in 2024. KwaZulu-Natal had the highest provincial pass rate. Fewer candidates reached 30% in Mathematics than in 2024.',
    relatedStatIds: ['matric-pass-rate', 'higher-education-enrolment'],
    relatedSlugs: ['south-africa-unemployment-crisis'],
    tags: ['education', 'matric', 'DBE', 'NSC', 'provinces', 'mathematics'],
    dataAsOf: { note: "This story is about the November 2025 NSC exams, from the Department of Basic Education's 2025 NSC Examination Report. The 2026 results are due in January 2027.", topicPath: '/category/education', topicLabel: 'Education' },
    sections: [
      {
        id: 'the-result',
        heading: 'What the 88.0% counts',
        body: '901 790 candidates registered for the November 2025 exams: 764 014 full-time and 137 776 part-time. The pass rate is worked out on the full-time candidates who wrote, 746 110 of them.\n\nThe Department of Basic Education (DBE) reports that 656 415 passed, a rate of 87.98%, up from 87.26% in 2024 (2025 NSC Examination Report, Executive summary and Table 1, page 6). Its chart of earlier years puts the rate at 81.3% in 2019 and 76.2% in 2020 (Figure 1, page 6).',
        statCallouts: ['matric-pass-rate'],
        highlight: '87.98% of the 746 110 full-time candidates who wrote passed.',
      },
      {
        id: 'pass-types',
        heading: 'Which kind of pass',
        body: 'A pass comes in levels. The highest, a Bachelor pass, is the minimum for admission to a university degree. In 2025, 345 857 candidates achieved one, 46.4% of those who wrote. The DBE says this is the most since 1996, when the first national exam was written (page 7).\n\nAnother 209 292 (28.1%) achieved a Diploma pass and 100 729 (13.5%) a Higher Certificate pass (Table 2, page 8).',
        highlight: '345 857 Bachelor passes, 46.4% of those who wrote.',
      },
      {
        id: 'provinces',
        heading: 'Provinces',
        body: 'KwaZulu-Natal had the highest pass rate, 90.60%, and the highest share of Bachelor passes, 52.0%. Free State (89.17%) and Gauteng (89.00%) came next. Eastern Cape had the lowest pass rate, 84.17%, and Northern Cape the lowest share of Bachelor passes, 39.3% (Table 2, page 8).\n\nThe other provinces: North West 88.49%, Western Cape 88.14%, Northern Cape 87.77%, Mpumalanga 86.55% and Limpopo 86.15%.',
      },
      {
        id: 'mathematics',
        heading: 'Mathematics went the other way',
        body: 'The report lists ten high-enrolment subjects. In seven, a higher share of candidates reached 30% than in 2024. Mathematics fell: 64.0% of the 254 415 who wrote it reached 30%, down from 69.1% in 2024. Accounting (77.9%, from 81.2%) and Agricultural Science (81.2%, from 86.9%) also fell (Table 3, page 8).\n\nNearly twice as many candidates wrote Mathematical Literacy (477 160) as Mathematics, and 86.2% of them reached 30%.',
        highlight: 'Mathematics: 64.0% reached 30% in 2025, down from 69.1% in 2024.',
      },
      {
        id: 'two-totals',
        heading: 'A note on the totals',
        body: 'The report gives two slightly different national totals. The executive summary and Table 1 give 656 415 passes (87.98%). Table 2, which breaks passes down by type, gives 656 221 (87.95%), and its provincial rows add up to that figure. The provincial numbers in this story are from Table 2. The headline rate is the 87.98% the DBE announced.',
      },
    ],
  },
]

export function getStoryBySlug(slug: string): Story | undefined {
  return STORIES.find((s) => s.slug === slug)
}

export function getFeaturedStories(): Story[] {
  return STORIES.filter((s) => s.featured)
}

export function getStoriesByCategory(category: string): Story[] {
  return STORIES.filter((s) => s.category === category || category === 'all')
}

export function getRelatedStories(slug: string): Story[] {
  const story = getStoryBySlug(slug)
  if (!story?.relatedSlugs) return []
  return story.relatedSlugs
    .map((s) => getStoryBySlug(s))
    .filter((s): s is Story => s !== undefined)
}
