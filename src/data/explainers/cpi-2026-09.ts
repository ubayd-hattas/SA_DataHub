import type { CpiExplainer, SourcedFigure } from '@/lib/explainers'

/**
 * CPI explainer for September 2026.
 *
 * Every value below was read from Stats SA P0141 September 2026
 * (sources/releases/P0141September2026.pdf) on 2026-10-26. Page numbers are
 * the printed page numbers in the release. The release writes decimals with
 * a comma (4,5%); the site writes 4.5%.
 */

const CHECKED = '2026-10-26'
const REL = 'statssa-p0141-2026-09'

function fig(value: number, unit: SourcedFigure['unit'], location: string, sourceId = REL): SourcedFigure {
  return { value, unit, sourceId, location, checkedOn: CHECKED }
}

const TABLE_C = 'Table C, page 5'
const contribution = (group: string, aug: number, sep: number) => ({
  group,
  previous: fig(aug, 'pp', TABLE_C),
  current: fig(sep, 'pp', TABLE_C),
})

export const cpi202609: CpiExplainer = {
  slug: 'cpi-2026-09',
  kind: 'cpi',
  period: 'September 2026',
  previousPeriod: 'August 2026',
  title: 'Inflation in September 2026',
  summary:
    'Consumer prices were 4.5% higher in September 2026 than a year earlier, up from 4.4% in August. Transport added the most to the rate.',
  publishedOn: CHECKED,
  sources: [
    {
      id: REL,
      publisher: 'Statistics South Africa (Stats SA)',
      title: 'Consumer Price Index, September 2026',
      code: 'P0141',
      releasedOn: '2026-10-21',
      url: 'https://www.statssa.gov.za',
      file: 'P0141September2026.pdf',
    },
    {
      id: 'statssa-cpi-history',
      publisher: 'Statistics South Africa (Stats SA)',
      title: 'CPI headline index numbers and year-on-year rates (Tables B1 and B2)',
      releasedOn: '2026-10-21',
      releasedOnNote:
        'The history file has no release date. Its latest values are for September 2026, which Stats SA released on 21 October 2026.',
      file: 'CPIHistory.pdf',
    },
  ],
  headline: {
    annual: fig(4.5, '%', 'Key findings, page 2; Table A, page 3'),
    previousAnnual: fig(4.4, '%', 'Key findings, page 2'),
    monthly: fig(0.4, '%', 'Key findings, page 2; Table A, page 3'),
  },
  contributions: [
    contribution('Transport', 1.2, 1.5),
    contribution('Housing and utilities', 1.3, 1.3),
    contribution('Insurance and financial services', 0.6, 0.6),
    contribution('Restaurants and accommodation services', 0.3, 0.3),
    contribution('Food and non-alcoholic beverages', 0.2, 0.2),
    contribution('Alcoholic beverages and tobacco', 0.2, 0.2),
    contribution('Health', 0.1, 0.1),
    contribution('Information and communication', 0.1, 0.1),
    contribution('Recreation, sport and culture', 0.1, 0.1),
    contribution('Education services', 0.1, 0.1),
    contribution('Personal care and miscellaneous services', 0.1, 0.1),
    contribution('Residual', 0.1, -0.1),
  ],
  contributionsTotal: contribution('All items', 4.4, 4.5),
  detail: [
    { label: 'Transport prices, change over the year', figure: fig(10.8, '%', 'Table E, page 7') },
    { label: 'Fuel prices, change over the year', figure: fig(27.9, '%', 'Table E, page 7') },
    { label: 'Housing and utilities prices, change over the year', figure: fig(5.2, '%', 'Table E, page 6') },
    { label: 'Insurance and financial services prices, change over the year', figure: fig(5.4, '%', 'Table E, page 7') },
  ],
  quote: {
    text: 'Annual consumer price inflation was 4,5% in September 2026, up from 4,4% in August 2026.',
    sourceId: REL,
    location: 'Key findings, page 2',
    checkedOn: CHECKED,
  },
  examples: [
    {
      label: 'A typical basket of goods and services',
      amount: 1000,
      thenLabel: 'September 2025',
      nowLabel: 'September 2026',
      indexThen: fig(103.4, 'index', 'Table A, page 3 (all items, Dec 2024 = 100)'),
      indexNow: fig(108.1, 'index', 'Table A, page 3 (all items, Dec 2024 = 100)'),
      rate: fig(4.5, '%', 'Table A, page 3'),
    },
    {
      label: 'Transport costs',
      amount: 1000,
      thenLabel: 'September 2025',
      nowLabel: 'September 2026',
      indexThen: fig(100.6, 'index', 'Table E, page 7 (transport, Dec 2024 = 100)'),
      indexNow: fig(111.5, 'index', 'Table E, page 7 (transport, Dec 2024 = 100)'),
      rate: fig(10.8, '%', 'Table E, page 7'),
    },
  ],
  coverage: [
    {
      text: 'The headline rate measures prices in urban areas. Stats SA publishes a separate rate for rural areas.',
      figures: [{ label: 'Rural areas, change over the year', figure: fig(3.1, '%', 'Table A, page 3') }],
      sourceId: REL,
      location: 'Key findings, page 2; Table A, page 3 and footnote 1',
    },
    {
      text: 'It is an average. Stats SA also groups households into ten spending groups (deciles), and the rate differs between them.',
      figures: [
        { label: 'Decile 1, change over the year', figure: fig(3.3, '%', 'Table A, page 3') },
        { label: 'Decile 1 upper limit', figure: fig(35864, 'R', 'Glossary, page 9') },
        { label: 'Decile 10, change over the year', figure: fig(4.8, '%', 'Table A, page 3') },
        { label: 'Decile 10 lower limit', figure: fig(307886, 'R', 'Glossary, page 9') },
      ],
      sourceId: REL,
      location: 'Table A, page 3; Glossary, page 9',
    },
    {
      text: 'Not every item is priced every month. Some, such as rents, school fees and municipal charges, are surveyed quarterly or once a year.',
      sourceId: REL,
      location: 'Key findings note, page 2; Table F, page 8',
    },
    {
      text: 'It describes prices that have already been measured. It is not a forecast.',
      sourceId: REL,
      location: 'Glossary, page 9 (definition of the annual inflation rate)',
    },
  ],
  history: {
    sourceId: 'statssa-cpi-history',
    checkedOn: CHECKED,
    location: 'Table B1, page 1; Table B2, pages 2 and 3',
  },
  nextRelease: {
    period: 'October 2026',
    date: '2026-11-18',
    sourceId: REL,
    location: 'Cover page; General information, page 10',
  },
}
