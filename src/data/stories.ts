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
    title: "South Africa's Unemployment Crisis",
    subtitle: 'Why one in three South Africans who want work cannot find it — and what is being done about it.',
    category: 'unemployment',
    categoryLabel: 'Unemployment',
    readingTimeMinutes: 7,
    publishedDate: '2026-01-15',
    lastUpdated: '2026-03-01',
    featured: true,
    coverEmoji: '📉',
    summary: 'South Africa has one of the world\'s highest unemployment rates. At 33.6%, more than 8.5 million people are jobless. This story examines the scale of the crisis, its causes, and what progress looks like.',
    relatedStatIds: ['unemployment-national', 'youth-unemployment-narrow', 'lfpr-overall'],
    relatedSlugs: ['inflation-what-it-means', 'gdp-growth-slowdown'],
    tags: ['unemployment', 'labour market', 'youth', 'QLFS'],
    sections: [
      {
        id: 'scale',
        heading: 'The scale of the problem',
        body: 'South Africa\'s unemployment rate stood at 33.6% in Q2 2026 — meaning roughly one in three South Africans who want a job cannot find one. That is approximately 8.5 million people.\n\nSeparately, the combined rate of unemployment and the potential labour force (LU3), which includes discouraged work-seekers who have given up looking, stood at 43.8% in the same period. Stats SA stopped reporting the former "expanded unemployment rate" after Q2 2025 in favour of LU3.\n\nBy any international measure, this is a crisis. South Africa consistently ranks among the highest unemployment rates in the world for a major economy.',
        statCallouts: ['unemployment-national'],
        highlight: 'The combined unemployment and potential labour force rate (LU3) reached 43.8% in Q2 2026.',
      },
      {
        id: 'youth',
        heading: 'Youth unemployment: a generation at risk',
        body: 'The crisis is especially acute for young people. Among those aged 15 to 34, the unemployment rate was 44.8% in Q4 2025. For the narrower 15–24 age group, the rate reaches 61.4% — meaning six in ten young South Africans actively seeking work cannot find it.\n\nThe NEET rate (Not in Education, Employment, or Training) is particularly concerning. A significant share of young South Africans are neither gaining work experience nor improving their skills — a structural trap that compounds over time.\n\nThe Western Cape, with its more diversified economy and stronger tourism sector, consistently records the lowest youth unemployment. The Eastern Cape and North West consistently record the highest.',
        statCallouts: ['youth-unemployment-narrow'],
        highlight: '6 in 10 young South Africans who want work cannot find it.',
      },
      {
        id: 'causes',
        heading: 'What drives such high unemployment?',
        body: 'South Africa\'s unemployment is structural, not just cyclical. It cannot be solved by economic growth alone — though growth is necessary.\n\nSeveral deep factors are at work. The mismatch between the skills employers need and those job-seekers have is severe. Apartheid-era education produced enormous inequality in outcomes, and despite progress, that legacy persists. The 2024 matric pass rate of 87.3% is a record high, but the quality of education — measured by literacy and numeracy at primary level — remains a serious concern.\n\nLabour market rigidity also plays a role. High minimum wages relative to productivity in certain sectors can reduce hiring. South Africa\'s labour laws are designed to protect workers, but critics argue they sometimes discourage formal-sector job creation.\n\nFinally, energy insecurity — the load-shedding crisis that peaked in 2022–23 — inflicted severe damage on small businesses, which are normally the primary engine of job creation. The situation has improved since late 2024, but the damage to the small business sector was substantial.',
      },
      {
        id: 'progress',
        heading: 'Signs of improvement — and their limits',
        body: 'While the Q4 2025 reading of 31.4% had represented an improvement from post-pandemic peaks, unemployment rose again in 2026 to reach 33.6% by Q2 2026. The number of employed South Africans stood at 16.7 million, with 8.5 million unemployed.\n\nThe formal sector continues to face headwinds. Even with occasional quarterly job gains in services and finance, the labour market is not absorbing new entrants fast enough to reduce structural unemployment meaningfully — South Africa\'s working-age population grows by roughly 500,000 people per year.\n\nThe SARB has maintained tight policy to safeguard price stability, hiking the repo rate to 7.25% in September 2026, while medium-term growth projections remain well below the 5–6% economists say is required to make a dent in structural unemployment.',
        statCallouts: ['lfpr-overall'],
      },
      {
        id: 'outlook',
        heading: 'The road ahead',
        body: 'Most economists agree that reducing South Africa\'s unemployment to sustainable levels requires sustained GDP growth above 3%, major improvements in education quality, reduced energy costs, and expanded infrastructure investment.\n\nThe 2026 budget introduced a temporary fiscal stimulus — expanding public employment programmes and extending social grants. These measures support household income but do not resolve the structural jobs deficit.\n\nThe South African government\'s target is to reduce unemployment to below 20% by 2030. Given current trajectories, that target appears unlikely to be met — but continued incremental improvement is achievable with policy consistency and stronger private investment.',
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
    lastUpdated: '2026-05-01',
    featured: true,
    coverEmoji: '🛒',
    summary: 'South Africa\'s annual average inflation hit 3.2% in 2025 — the lowest in 21 years. The headline number suggests relief, but food prices, electricity tariffs, and interest rates still squeeze millions of households.',
    relatedStatIds: ['cpi-headline', 'food-inflation', 'repo-rate', 'annual-cpi-avg'],
    relatedSlugs: ['south-africa-unemployment-crisis', 'gdp-growth-slowdown'],
    tags: ['inflation', 'CPI', 'SARB', 'interest rates', 'food prices'],
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
        statCallouts: ['annual-cpi-avg', 'repo-rate'],
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
    lastUpdated: '2026-03-15',
    featured: false,
    coverEmoji: '📊',
    summary: 'South Africa\'s economy grew 1.1% in 2025 — its strongest performance since 2022. But economists say 5% annual growth is needed to make a real dent in unemployment. This story explains the gap between what is happening and what is needed.',
    relatedStatIds: ['gdp-growth', 'gdp-annual-growth', 'gdp-nominal'],
    relatedSlugs: ['south-africa-unemployment-crisis', 'inflation-what-it-means'],
    tags: ['GDP', 'economic growth', 'Stats SA', 'load shedding'],
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
        body: 'South Africa\'s population grows by roughly 1% per year. That means GDP must grow by at least 1% just to keep GDP per capita flat. At 1.1%, 2025 growth barely kept the country\'s head above water on a per-capita basis.\n\nMost development economists argue South Africa needs sustained GDP growth of 5% or more to meaningfully reduce the 33.6% unemployment rate. The World Bank and IMF have similar benchmarks for the level of growth needed to reduce structural poverty.\n\nSouth Africa has not grown above 3% since 2011 — more than a decade of sustained underperformance. Over that period, the economy grew at an average of around 1% per year in real terms.',
      },
      {
        id: 'what-held-back',
        heading: 'What held the economy back',
        body: 'The structural constraints on South African growth are well documented.\n\nLoad-shedding — scheduled electricity outages — inflicted billions of rands of economic damage each year from 2022 to 2024. The situation improved significantly from late 2024 as Eskom\'s maintenance programme bore fruit and new renewable energy capacity came online. But load-shedding has not been eliminated, and its legacy damage to business confidence and investment takes time to repair.\n\nLogistics constraints also remain severe. Transnet, the state freight rail and ports company, has struggled with operational problems, theft of infrastructure, and deferred maintenance. Mining and agricultural exporters — the backbone of South Africa\'s current account — have been particularly hard hit.\n\nManufacturing recorded its second consecutive year of negative growth in 2025. Construction posted its ninth straight year of decline. Both sectors are critical for labour-intensive job creation.',
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
    summary: 'South Africa recorded 26,232 murders in 2023/24 — a decline from the prior year\'s peak. But crime statistics are complex documents. This story explains what they measure, what they miss, and how to read them critically.',
    relatedStatIds: ['murder-rate', 'crime-contact', 'crime-robbery'],
    relatedSlugs: ['south-africa-unemployment-crisis'],
    tags: ['crime', 'SAPS', 'murder', 'contact crime'],
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
        body: 'Murder is considered the most reliable crime statistic internationally because bodies are difficult to conceal and the police almost always record them. The 2023/24 figure of 26,232 murders — a 4.6% decline from the 27,494 in 2022/23 — is therefore meaningful.\n\nThis equates to approximately 72 murders per day, or a rate of 41.9 per 100,000 population. For context, the global average is around 6 per 100,000. South Africa\'s rate is more than six times higher.\n\nGauteng, KwaZulu-Natal, and the Western Cape account for the majority of murders. The Cape Flats area of Cape Town — plagued by gang violence — has been a persistent hotspot. The SAPS has deployed the military in several Western Cape communities in recent years as part of anti-gang operations.',
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
    slug: 'matric-results-2024',
    title: 'Matric 2024: Record Pass Rate, Persistent Inequalities',
    subtitle: 'The 87.3% pass rate is a record high — but the story behind the number is more complicated.',
    category: 'education',
    categoryLabel: 'Education',
    readingTimeMinutes: 4,
    publishedDate: '2026-01-20',
    lastUpdated: '2026-01-20',
    featured: false,
    coverEmoji: '🎓',
    summary: 'South Africa\'s 2024 matric pass rate hit a record 87.3%, up from 82.9% in 2023. That\'s genuinely good news. But the rate masks large disparities between provinces, school types, and subjects.',
    relatedStatIds: ['matric-pass-rate', 'education-literacy', 'higher-education-enrolment'],
    relatedSlugs: ['south-africa-unemployment-crisis'],
    tags: ['education', 'matric', 'DBE', 'NSC', 'inequality'],
    sections: [
      {
        id: 'the-record',
        heading: 'A record worth celebrating — carefully',
        body: 'The 2024 National Senior Certificate pass rate of 87.3% is the highest since the current examination system was introduced in 2008. More than one million candidates wrote the exams, and a record 47.8% achieved a bachelor\'s degree pass — meaning they qualified for university entrance.\n\nThat is genuine progress. The sustained upward trend since 2015, with the exception of the COVID-disrupted 2020 cohort, reflects real improvements in teaching quality, curriculum support, and school management in many parts of the country.',
        statCallouts: ['matric-pass-rate'],
        highlight: 'A record 87.3% pass rate — but what counts as a "pass" matters enormously.',
      },
      {
        id: 'what-counts',
        heading: 'What "passing" actually means',
        body: 'The National Senior Certificate requires a minimum of 30% in three subjects and 40% in three others. This is a relatively low bar. Critics have long argued that the matric pass rate gives an overly optimistic picture of educational achievement.\n\nInternational assessments tell a more sobering story. South Africa consistently performs poorly in PIRLS (reading literacy) and TIMSS (mathematics and science) assessments. In the 2021 PIRLS study, 81% of South African Grade 4 learners could not read for meaning in any language — the worst result among all 57 participating countries.\n\nThe matric pass rate and actual literacy and numeracy skills are not the same thing.',
        highlight: 'In 2021, 81% of SA Grade 4 learners could not read for meaning — the worst result globally.',
      },
      {
        id: 'inequality',
        heading: 'Provincial and school-type disparities',
        body: 'The Western Cape (89.1%) and Free State (88.4%) consistently lead provincial pass rates. The Eastern Cape (79.8%) and KwaZulu-Natal (81.4%) lag behind.\n\nThe gap between fee-paying independent schools and no-fee public schools is stark. Independent schools achieve pass rates above 98% with high bachelor\'s pass rates. Many quintile 1 and 2 schools (the poorest) struggle to achieve 70%.\n\nThese disparities reflect decades of unequal investment in school infrastructure, teacher quality, and learning materials. Closing them requires sustained, targeted investment — not just in examinations, but in the foundation phases of schooling.',
        statCallouts: ['education-literacy'],
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
