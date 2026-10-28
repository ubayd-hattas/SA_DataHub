import type { QlfsExplainer, SourcedFigure, SourcedQuote } from '@/lib/explainers'

/**
 * Unemployment explainer for the second quarter of 2026.
 *
 * Every value below was read from Stats SA P0211, Quarterly Labour Force
 * Survey, Quarter 2: 2026 (sources/releases/qlfs-2026-q2-statisticalrelease.pdf)
 * on 2026-10-28. Page numbers are the printed page numbers in the release.
 * Counts are in thousands, as published. The release writes decimals with a
 * comma (33,6%); the site writes 33.6%. Quotes keep the release's commas.
 */

const CHECKED = '2026-10-28'
const REL = 'statssa-p0211-2026-q2'
const TABLE_A = 'Table A, page 1'

function fig(value: number, unit: SourcedFigure['unit'], location = TABLE_A): SourcedFigure {
  return { value, unit, sourceId: REL, location, checkedOn: CHECKED }
}

function quote(text: string, location: string): SourcedQuote {
  return { text, sourceId: REL, location, checkedOn: CHECKED }
}

/** A Table A row in thousands: Apr-Jun 2025, Jan-Mar 2026, Apr-Jun 2026 and the quarter change. */
const count = (label: string, yearAgo: number, previous: number, current: number, quarterChange: number) => ({
  label,
  yearAgo: fig(yearAgo, 'thousand'),
  previous: fig(previous, 'thousand'),
  current: fig(current, 'thousand'),
  quarterChange: fig(quarterChange, 'thousand'),
})

const rate = (yearAgo: number, previous: number, current: number) => ({
  yearAgo: fig(yearAgo, '%'),
  previous: fig(previous, '%'),
  current: fig(current, '%'),
})

export const qlfs2026q2: QlfsExplainer = {
  slug: 'qlfs-2026-q2',
  kind: 'qlfs',
  categoryId: 'unemployment',
  period: 'Q2 2026',
  periodMonths: 'April to June 2026',
  previousPeriod: 'Q1 2026',
  yearAgoPeriod: 'Q2 2025',
  title: 'Unemployment in the second quarter of 2026',
  summary:
    'The official unemployment rate was 33.6% from April to June 2026, up from 32.7% in the first quarter. The number of unemployed people rose by 345 000 and the number employed fell by 16 000.',
  publishedOn: CHECKED,
  sources: [
    {
      id: REL,
      publisher: 'Statistics South Africa (Stats SA)',
      title: 'Quarterly Labour Force Survey, Quarter 2: 2026',
      shortName: 'Stats SA P0211 Q2 2026',
      code: 'P0211',
      releasedOn: '2026-08-11',
      releasedOnNote: 'The cover page gives the embargo: 11 August 2026, 11:00.',
      url: 'https://www.statssa.gov.za',
      file: 'qlfs-2026-q2-statisticalrelease.pdf',
    },
  ],
  headline: {
    rate: fig(33.6, '%'),
    previousRate: fig(32.7, '%'),
    yearAgoRate: fig(33.2, '%'),
    quarterChange: fig(0.9, 'pp'),
    yearChange: fig(0.4, 'pp'),
  },
  counts: [
    count('Labour force', 25174, 24891, 25220, 329),
    count('Employed', 16807, 16754, 16739, -16),
    count('Unemployed', 8367, 8137, 8481, 345),
    count('Outside the labour force', 16648, 17298, 17090, -208),
    count('Potential labour force', 4299, 4851, 4571, -280),
    count('Discouraged job-seekers', 3445, 3893, 3665, -227),
  ],
  reason: quote(
    'A decrease in employment and an increase in unemployment resulted in an increase of 0,9 of a percentage point in the unemployment rate to 33,6% in the second quarter of 2026.',
    'Highlights of the results, page 2',
  ),
  quote: quote(
    'While these revisions strengthen how certain aspects of the labour market are captured, they do not affect the measurement or definition of employment and unemployment. Therefore, headline unemployment figures remain comparable and consistent with previous quarters.',
    'Introduction, page 1',
  ),
  rates: [
    {
      code: 'LU1',
      label: 'Official unemployment rate',
      ...rate(33.2, 32.7, 33.6),
      definition: quote('Unemployment rate is the proportion of the labour force that is unemployed.', 'Concepts and definitions, page 18'),
    },
    {
      code: 'LU2',
      label: 'Unemployment and time-related underemployment',
      ...rate(36.1, 35.9, 36.6),
      definition: quote(
        'Persons in underemployment (time-related) are employed persons who were willing and available to work additional hours, whose total number of hours actually worked during the reference period were below 35 hours per week.',
        'Concepts and definitions, page 18',
      ),
    },
    {
      code: 'LU3',
      label: 'Unemployment and potential labour force',
      ...rate(43.0, 43.7, 43.8),
      definition: quote(
        'The potential labour force includes persons who are not in the labour force, but are either available for work but not actively seeking employment or actively seeking employment but not currently available to work.',
        'Concepts and definitions, page 18',
      ),
    },
    {
      code: 'LU4',
      label: 'Composite measure of labour underutilisation',
      ...rate(45.4, 46.3, 46.3),
      definition: quote(
        'the composite measure of labour underutilisation (LU4) that combines unemployment, time-related underemployment, and potential labour force.',
        'Highlights of the results, page 2',
      ),
    },
  ],
  ratesReason: quote(
    'The report now includes other labour underutilisation indicators in addition to unemployment, primarily because unemployment is not the only measure of labour underutilisation.',
    'Introduction, page 1',
  ),
  ratesNote: quote(
    'It is crucial that these indicators are understood as complementary and that they highlight persons in different situations with different degrees of attachment to the labour market.',
    'Highlights of the results, page 2',
  ),
  definitions: [
    {
      term: 'Unemployed (official definition)',
      text: quote(
        'Unemployed persons according to the Official definition are those (aged 15–64 years) who: a) were not employed in the reference week; and b) actively looked for work or tried to start a business in the four weeks preceding the survey interview; and c) were available for work, i.e. would have been able to start work or a business in the reference week; or d) had not actively looked for work in the past four weeks but had a job or business to start at a definite date in the future and were available.',
        'Concepts and definitions, page 18',
      ),
    },
    {
      term: 'Employed',
      text: quote(
        'Employed persons are those aged 15–64 years who, during the reference week, did any work for at least one hour, or had a job or business but were not at work (i.e. were temporarily absent).',
        'Concepts and definitions, page 16',
      ),
    },
    {
      term: 'Labour force',
      text: quote('The labour force comprises all persons who are employed, plus all persons who are unemployed.', 'Concepts and definitions, page 17'),
    },
    {
      term: 'Discouraged work-seeker',
      text: quote(
        'Discouraged work-seeker is a person who was not employed during the reference period, wanted to work, was available to work/start a business but did not take active steps to find work during the last four weeks, provided that the main reason given for not seeking work was any of the following: no jobs available in the area; unable to find work requiring his/her skills; lost hope of finding any kind of work.',
        'Concepts and definitions, page 16',
      ),
    },
  ],
  coverage: [
    {
      text: 'It is a household sample survey. Stats SA asks people in a sample of dwellings across the country, so the figures are estimates with a margin of error, not a count of everyone.',
      figures: [{ label: 'Dwellings in the expected sample, approximately', figure: fig(33, 'thousand', 'Survey requirements and design, page 13') }],
      sourceId: REL,
      location: 'Introduction, page 1; Survey requirements and design, page 13; Reliability of the survey estimates, page 15',
    },
    {
      text: 'Not every sampled household answers. Stats SA adjusts the weights for those that do not.',
      figures: [{ label: 'Response rate, national, Q2 2026', figure: fig(86.9, '%', 'Table G, page 13') }],
      sourceId: REL,
      location: 'Table G, page 13; Non-response adjustment, page 14',
    },
    {
      text: 'The report covers people aged 15 to 64. The survey collects data on people aged 15 and older.',
      sourceId: REL,
      location: 'Introduction, page 1',
    },
    {
      text: 'One hour of work in the reference week counts as being employed.',
      sourceId: REL,
      location: 'Concepts and definitions, page 16',
    },
    {
      text: 'Stats SA revised the questionnaire in Q3 2025. It says the change does not affect the unemployment rate, but formal and informal sector figures from Q3 2025 cannot be compared with earlier quarters.',
      sourceId: REL,
      location: 'Introduction, page 1; Table A footnote, pages 1 and 2',
    },
  ],
  nextRelease: { period: 'Q3 2026', month: 'November 2026', sourceId: REL, location: 'Cover page' },
}
