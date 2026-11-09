/**
 * The glossary at /glossary. Each official definition is quoted exactly from
 * a release SA Data Hub holds, with the printed page. The plain-English line
 * is SA Data Hub's own wording. Election terms have no official quote: they
 * describe how the IEC's results files are laid out, as used on the site.
 */

export type GlossaryTopic = 'labour' | 'prices' | 'population' | 'economy' | 'elections'

export interface GlossarySource {
  document: string
  location: string
}

export interface GlossaryTerm {
  slug: string
  term: string
  topic: GlossaryTopic
  /** SA Data Hub's own one-line explanation. */
  plain: string
  /** The publisher's definition, quoted exactly. */
  official?: { text: string; source: GlossarySource }
  /** Series on the site measured with this term. */
  seriesIds?: string[]
  /** Other pages that explain or use the term. */
  links?: { href: string; label: string }[]
}

export const GLOSSARY_TOPICS: { id: GlossaryTopic; label: string }[] = [
  { id: 'labour', label: 'Jobs and unemployment' },
  { id: 'prices', label: 'Prices and inflation' },
  { id: 'population', label: 'Population' },
  { id: 'economy', label: 'The economy' },
  { id: 'elections', label: 'Elections' },
]

const QLFS: (page: number) => GlossarySource = (page) => ({
  document: 'Stats SA, Quarterly Labour Force Survey, Quarter 2: 2026 (P0211)',
  location: `Concepts and definitions, page ${page}`,
})
const CPI: GlossarySource = { document: 'Stats SA, Consumer Price Index, September 2026 (P0141)', location: 'Glossary, page 9' }
const MYE: GlossarySource = {
  document: 'Stats SA, Mid-year population estimates 2026 (P0302)',
  location: 'Definition of concepts, page vi',
}
const GDP: GlossarySource = { document: 'Stats SA, Gross domestic product, first quarter 2026 (P0441)', location: 'page 2, note 1' }
const UNEMPLOYMENT_RATES = { href: '/why-numbers-differ#unemployment', label: 'Why there are four unemployment rates' }
const ELECTION_METHOD = { href: '/elections-2026#method', label: 'How the 2026 results were counted' }

export const GLOSSARY: GlossaryTerm[] = [
  // Jobs and unemployment
  {
    slug: 'unemployment-rate',
    term: 'Unemployment rate (official, LU1)',
    topic: 'labour',
    plain: 'Of the people who have work or are looking for it, the share who are looking.',
    official: { text: 'Unemployment rate is the proportion of the labour force that is unemployed.', source: QLFS(18) },
    seriesIds: ['unemployment-national', 'youth-unemployment-narrow', 'youth-unemployment-1524'],
    links: [UNEMPLOYMENT_RATES],
  },
  {
    slug: 'unemployed',
    term: 'Unemployed (official definition)',
    topic: 'labour',
    plain: 'Aged 15 to 64, without work, looked for work in the past four weeks and could start straight away.',
    official: {
      text: 'Unemployed persons according to the Official definition are those (aged 15–64 years) who: a) were not employed in the reference week; and b) actively looked for work or tried to start a business in the four weeks preceding the survey interview; and c) were available for work, i.e. would have been able to start work or a business in the reference week; or d) had not actively looked for work in the past four weeks but had a job or business to start at a definite date in the future and were available.',
      source: QLFS(18),
    },
    links: [UNEMPLOYMENT_RATES],
  },
  {
    slug: 'employed',
    term: 'Employed',
    topic: 'labour',
    plain: 'Did at least one hour of work in the survey week, or has a job they were away from.',
    official: {
      text: 'Employed persons are those aged 15–64 years who, during the reference week, did any work for at least one hour, or had a job or business but were not at work (i.e. were temporarily absent).',
      source: QLFS(16),
    },
  },
  {
    slug: 'labour-force',
    term: 'Labour force',
    topic: 'labour',
    plain: 'Everyone employed plus everyone unemployed.',
    official: { text: 'The labour force comprises all persons who are employed, plus all persons who are unemployed.', source: QLFS(17) },
  },
  {
    slug: 'labour-force-participation-rate',
    term: 'Labour force participation rate',
    topic: 'labour',
    plain: 'The share of people aged 15 to 64 who are working or looking for work.',
    official: {
      text: 'Labour force participation rate is the proportion of the working-age population that is either employed or unemployed.',
      source: QLFS(17),
    },
    seriesIds: ['lfpr-overall', 'female-labour-participation'],
  },
  {
    slug: 'absorption-rate',
    term: 'Absorption rate (employment-to-population ratio)',
    topic: 'labour',
    plain: 'The share of people aged 15 to 64 who have work.',
    official: {
      text: 'Employment-to-population ratio (labour absorption rate) is the proportion of the working-age population that is employed.',
      source: QLFS(16),
    },
  },
  {
    slug: 'working-age-population',
    term: 'Working-age population',
    topic: 'labour',
    plain: 'Everyone old enough to work. The labour force survey reports on people aged 15 to 64.',
    official: {
      text: 'The working age population consists of all individuals aged 15 years and older who are considered capable of working regardless of their employment status.',
      source: QLFS(18),
    },
  },
  {
    slug: 'outside-the-labour-force',
    term: 'Outside the labour force',
    topic: 'labour',
    plain: 'Aged 15 to 64 and neither working nor counted as unemployed, for example students and people not looking.',
    official: {
      text: 'Outside the Labour Force (previously Not economically Active): Persons aged 15–64 years who are neither employed nor unemployed in the reference period.',
      source: QLFS(17),
    },
  },
  {
    slug: 'potential-labour-force',
    term: 'Potential labour force',
    topic: 'labour',
    plain: 'People who want work but either did not look for it or could not start yet. Adding them gives the LU3 rate.',
    official: {
      text: 'The potential labour force includes persons who are not in the labour force, but are either available for work but not actively seeking employment or actively seeking employment but not currently available to work.',
      source: QLFS(18),
    },
    links: [UNEMPLOYMENT_RATES],
  },
  {
    slug: 'discouraged-work-seeker',
    term: 'Discouraged work-seeker',
    topic: 'labour',
    plain: 'Wants work and could start, but stopped looking because they believe there is no work for them.',
    official: {
      text: 'Discouraged work-seeker is a person who was not employed during the reference period, wanted to work, was available to work/start a business but did not take active steps to find work during the last four weeks, provided that the main reason given for not seeking work was any of the following: no jobs available in the area; unable to find work requiring his/her skills; lost hope of finding any kind of work.',
      source: QLFS(16),
    },
  },
  {
    slug: 'time-related-underemployment',
    term: 'Time-related underemployment',
    topic: 'labour',
    plain: 'Working fewer than 35 hours a week while wanting, and able, to work more. Adding them gives the LU2 rate.',
    official: {
      text: 'Persons in underemployment (time-related) are employed persons who were willing and available to work additional hours, whose total number of hours actually worked during the reference period were below 35 hours per week.',
      source: QLFS(18),
    },
    links: [UNEMPLOYMENT_RATES],
  },
  {
    slug: 'labour-underutilisation',
    term: 'Labour underutilisation (LU4)',
    topic: 'labour',
    plain: 'The widest measure: unemployed people, people wanting more hours and the potential labour force together.',
    official: {
      text: 'Labour underutilisation refers to mismatches between labour supply and demand which translates into an unmet need for employment among the population. The measure of Labour underutilisation includes: Time-related underemployment, Unemployment, and Potential labour force.',
      source: QLFS(17),
    },
    links: [UNEMPLOYMENT_RATES],
  },
  {
    slug: 'long-term-unemployment',
    term: 'Long-term unemployment',
    topic: 'labour',
    plain: 'Unemployed and looking for work for a year or more.',
    official: {
      text: 'Persons in long-term unemployment are those individuals among the unemployed who were without work and trying to find a job or start a business for one year or more.',
      source: QLFS(17),
    },
  },

  // Prices and inflation
  {
    slug: 'inflation-rate',
    term: 'Inflation rate (annual)',
    topic: 'prices',
    plain: 'How much prices rose over the past year: this month’s consumer price index against the same month last year.',
    official: {
      text: 'The annual inflation rate is the change in the index of the relevant month of the current year compared with the index of the same month in the previous year expressed as a percentage. The inflation rate is the annual change in the CPI for all items.',
      source: CPI,
    },
    seriesIds: ['cpi-headline', 'food-inflation'],
    links: [{ href: '/tools/money-value', label: 'What money was worth since 1980' }],
  },
  {
    slug: 'monthly-percentage-change',
    term: 'Monthly percentage change',
    topic: 'prices',
    plain: 'How much prices moved since last month. It jumps around more than the annual rate.',
    official: {
      text: 'The monthly percentage change is the change in the index of the relevant month compared with the index of the previous month expressed as a percentage.',
      source: CPI,
    },
  },
  {
    slug: 'average-annual-inflation',
    term: 'Average annual inflation rate',
    topic: 'prices',
    plain: 'The average price level over a whole year compared with the year before.',
    official: {
      text: 'The average annual inflation rate is the change in the average index of one year compared with the average index of the previous year expressed as a percentage.',
      source: CPI,
    },
    seriesIds: ['annual-cpi-avg'],
  },
  {
    slug: 'administered-prices',
    term: 'Administered prices',
    topic: 'prices',
    plain: 'Prices set or controlled by government, such as electricity, water, fuel and public school fees.',
    official: {
      text: 'An administered price refers to the price of a product or service set directly or significantly influenced by the government, either directly or through its agencies, without relying on market forces. This includes prices charged by the private sector but controlled by the government.',
      source: CPI,
    },
  },

  // Population
  {
    slug: 'population-estimate',
    term: 'Population estimate (mid-year estimate)',
    topic: 'population',
    plain: 'A calculated figure for the population at 30 June, not a count. Stats SA revises the whole series every year.',
    official: {
      text: 'A calculation of the size or distribution of a population or another characteristic of the population for the present or past.',
      source: MYE,
    },
    seriesIds: ['population-total'],
    links: [{ href: '/why-numbers-differ#population', label: 'Why population figures differ' }],
  },
  {
    slug: 'cohort-component-projection',
    term: 'Cohort-component method',
    topic: 'population',
    plain: 'Start from a base population by age and sex, then add births, subtract deaths and allow for migration, year by year.',
    official: {
      text: 'A projection made by subjecting all cohorts, on an annual or five-year basis, to mortality and migration assumptions, and applying fertility assumptions to women of reproductive age.',
      source: MYE,
    },
    links: [{ href: '/why-numbers-differ#population', label: 'Why population figures differ' }],
  },
  {
    slug: 'life-expectancy',
    term: 'Life expectancy at birth',
    topic: 'population',
    plain: 'How long a newborn would live on average if this year’s death rates never changed.',
    official: {
      text: 'The average number of additional years a person could expect to live if the age-specific death rates for a given year prevailed for the rest of his/her life.',
      source: MYE,
    },
  },
  {
    slug: 'total-fertility-rate',
    term: 'Total fertility rate',
    topic: 'population',
    plain: 'The average number of children a woman would have at today’s birth rates.',
    official: {
      text: 'The average number of children born alive to a woman during her lifetime if she were to bear children at each age in accordance with the prevailing age-specific fertility rates.',
      source: MYE,
    },
  },
  {
    slug: 'sex-ratio',
    term: 'Sex ratio',
    topic: 'population',
    plain: 'Men for every 100 women. Under 100 means more women than men.',
    official: { text: 'The number of males per 100 females in a population.', source: MYE },
    links: [{ href: '/municipalities', label: 'Sex ratio for every municipality' }],
  },

  // The economy
  {
    slug: 'gdp-growth',
    term: 'GDP growth (quarter on quarter, seasonally adjusted)',
    topic: 'economy',
    plain: 'How much the economy grew since the previous quarter, after removing price changes and the usual seasonal ups and downs.',
    official: {
      text: 'Unless otherwise specified, growth rates are quarter-on-quarter, seasonally adjusted. All growth rates are calculated on the basis of series at constant prices.',
      source: GDP,
    },
    seriesIds: ['gdp-growth'],
  },

  // Elections
  {
    slug: 'pr-ballot',
    term: 'PR ballot',
    topic: 'elections',
    plain: 'The ballot that lists parties, not candidates. Council seats are shared out using these votes together with the ward votes.',
    links: [ELECTION_METHOD],
  },
  {
    slug: 'ward-ballot',
    term: 'Ward ballot',
    topic: 'elections',
    plain: 'The ballot that elects one councillor for the ward. The candidate with the most votes wins the seat.',
    links: [ELECTION_METHOD],
  },
  {
    slug: 'dc-40-ballot',
    term: 'District council (DC 40%) ballot',
    topic: 'elections',
    plain: 'A third ballot, cast only in local municipalities, that elects part of the district council. Metro voters do not get one.',
    links: [ELECTION_METHOD],
  },
  {
    slug: 'turnout',
    term: 'Turnout',
    topic: 'elections',
    plain: 'On SA Data Hub: votes cast on the PR ballot, valid and spoilt, as a share of registered voters.',
    links: [ELECTION_METHOD],
  },
]

export const GLOSSARY_PATH = '/glossary'

export function glossaryHref(slug: string): string {
  return `${GLOSSARY_PATH}#${slug}`
}

/** Glossary terms that describe a given series. */
export function termsForSeries(seriesId: string): GlossaryTerm[] {
  return GLOSSARY.filter((t) => t.seriesIds?.includes(seriesId))
}
