/**
 * Answers: one page per factual question people search for. Every figure is
 * computed here from records already checked against a release, so the
 * answers and the rest of the site always agree. Nothing here is a ranking of
 * "best" or "safest" places, and there is one page per question, never one
 * per municipality.
 */
import type { MunicipalityRecord } from '@/types'
import { getAllMunicipalities, getStatById, provinces } from '@/data/mock'
import provinceRows from '@/data/census-provinces.json'
import derived from '../../sources/derived/provinces-at-a-glance-municipal-tables.json'
import { EXPLAINERS } from '@/data/explainers'
import { isCpi, isQlfs } from '@/lib/explainers'
import { CENSUS_SOURCE } from '@/lib/municipality-profile'
import { municipalChanges, rankChanges, getChangeMeasure } from '@/lib/census-change'
import { statDates } from '@/lib/stat-summary'
import { formatCount, formatDecimal, formatPercent, formatSigned } from '@/lib/format'
import type { GuessUnit } from '@/lib/guess'

export interface AnswerSource {
  publisher: string
  title: string
  code?: string
  location?: string
  releasedOn: string
  checkedOn: string
}

export interface AnswerRow {
  label: string
  href?: string
  value: number
  display: string
  note?: string
}

export interface Answer {
  slug: string
  question: string
  /** The first sentence: the answer, with the number, the period and the source. */
  answer: string
  /** Topic page this answer belongs to, for links from that page. */
  topic: 'population' | 'unemployment' | 'inflation' | 'housing' | 'census' | 'municipalities'
  /** One chart (bars) or one top-10 list. */
  figure: { kind: 'bars' | 'list'; title: string; rows: AnswerRow[]; max?: number }
  /** A "Guess first" question about a figure the chart shows (not the one in the answer). */
  guess?: { question: string; min: number; max: number; step: number; unit: GuessUnit; value: number; source: string }
  method: string[]
  sources: AnswerSource[]
  related: string[]
  /** Extra words for site search. */
  keywords: string
}

// ─── Sources ─────────────────────────────────────────────────────────────────

const census = (location: string): AnswerSource => ({
  publisher: CENSUS_SOURCE.publisher,
  title: CENSUS_SOURCE.title,
  code: CENSUS_SOURCE.code,
  location,
  releasedOn: CENSUS_SOURCE.releasedOn,
  checkedOn: CENSUS_SOURCE.checkedOn,
})

function fromStat(id: string, location: string): AnswerSource {
  const s = getStatById(id)!
  const { releasedOn, checkedOn } = statDates(s)
  return { publisher: 'Stats SA', title: s.source.publicationName ?? s.title, location, releasedOn, checkedOn }
}

const QLFS_TABLE_E: AnswerSource = {
  publisher: 'Stats SA',
  title: 'Quarterly Labour Force Survey, Quarter 2: 2026',
  code: 'P0211',
  location: 'Table E, page 7',
  releasedOn: '2026-08-11',
  checkedOn: '2026-10-28',
}

const MYPE: AnswerSource = {
  publisher: 'Stats SA',
  title: 'Mid-year population estimates, 2026',
  code: 'P0302',
  location: 'Appendix 1, page 27',
  releasedOn: '2026-07-30',
  checkedOn: '2026-10-28',
}

// ─── Data helpers ────────────────────────────────────────────────────────────

const munis = () => getAllMunicipalities()
const muniRow = (m: MunicipalityRecord, value: number, display: string, note?: string): AnswerRow => ({
  label: m.name,
  href: `/municipalities/${m.id}`,
  value,
  display,
  note: note ?? m.provinceName,
})

interface ProvinceRow {
  name: string
  person: { printedPage: number; values: number[] }
  housing1: { printedPage: number; values: number[] }
  housing2: { printedPage: number; values: number[] }
}
const pRows = provinceRows as unknown as ProvinceRow[]
const provinceSlug = (name: string) => provinces.find((p) => p.name === name)?.id

/** Appendix 1 total, Mid-year population estimates 2026 (P0302), page 27. */
const MID_2026_TOTAL = 63522380

const share = (part: number, ...parts: number[]) => Math.round((1000 * part) / parts.reduce((a, b) => a + b, 0)) / 10
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const census2022Total = sum(pRows.map((p) => p.person.values[7]))
const census2011Total = sum(pRows.map((p) => p.person.values[2]))
const households2022 = sum(pRows.map((p) => p.housing1.values[2]))
const households2011 = sum(pRows.map((p) => p.housing1.values[0]))

/** District municipalities in Provinces at a glance: the rows with category C1 or C2. */
function districts(): { name: string; province: string }[] {
  const rows = Object.values((derived as unknown as { tables: { person: Record<string, { name: string; code: string | null; miif: string | null; pdfPage: number }> } }).tables.person)
  const out: { name: string; province: string }[] = []
  let province = ''
  for (const r of rows) {
    if (!r.code && !r.miif) province = pRows.find((p) => p.name.replace(/[^a-z]/gi, '').toLowerCase() === r.name.replace(/[^a-z]/gi, '').toLowerCase())?.name ?? province
    if (r.miif === 'C1' || r.miif === 'C2') out.push({ name: r.name, province })
  }
  return out
}

const byProvince = <T,>(items: T[], key: (t: T) => string) =>
  pRows.map((p) => ({ name: p.name, items: items.filter((i) => key(i) === p.name) }))

// ─── The answers ─────────────────────────────────────────────────────────────

function build(): Answer[] {
  const all = munis()
  const metros = all.filter((m) => m.category === 'A')
  const byPop = [...all].sort((a, b) => b.population2022 - a.population2022)
  const popMeasure = getChangeMeasure('population')!
  const { rises, falls } = rankChanges(popMeasure)
  const fell = municipalChanges(popMeasure).filter((c) => c.change < 0).length
  const dists = districts()
  const unemployment = getStatById('unemployment-national')!
  const unemploymentSeries = unemployment.series![0].data
  const youth = getStatById('youth-unemployment-narrow')!
  const youth1524 = getStatById('youth-unemployment-1524')!
  const repo = getStatById('repo-rate-sarb')!
  const prime = getStatById('prime-lending-rate')!
  const cpi = EXPLAINERS.find(isCpi)!
  const qlfs = EXPLAINERS.find(isQlfs)!
  const provByRate = [...provinces].sort((a, b) => a.unemploymentRate - b.unemploymentRate)
  const provByPop = [...provinces].sort((a, b) => b.population - a.population)
  const noToilet = [...all].sort((a, b) => b.pctNoToilet2022 - a.pctNoToilet2022)
  const formalByProv = pRows
    .map((p) => {
      const h = p.housing1.values
      return { name: p.name, v2022: share(h[8], h[8], h[9], h[10], h[11]), v2011: share(h[4], h[4], h[5], h[6], h[7]), page: p.housing1.printedPage }
    })
    .sort((a, b) => b.v2022 - a.v2022)
  const sizeByProv = pRows.map((p) => ({ name: p.name, v2022: p.housing1.values[3], v2011: p.housing1.values[1] })).sort((a, b) => b.v2022 - a.v2022)
  const growthByProv = pRows
    .map((p) => ({ name: p.name, change: ((p.person.values[7] - p.person.values[2]) / p.person.values[2]) * 100, a: p.person.values[2], b: p.person.values[7] }))
    .sort((a, b) => b.change - a.change)
  const nationalSize2022 = Math.round((10 * census2022Total) / households2022) / 10
  const nationalSize2011 = Math.round((10 * census2011Total) / households2011) / 10
  const provPages = (k: 'person' | 'housing1') => pRows.map((p) => p[k].printedPage).join(', ')
  const bush = all.find((m) => m.id === 'MP325')!
  const popChange = ((census2022Total - census2011Total) / census2011Total) * 100
  const lu = qlfs.rates

  return [
    {
      slug: 'how-many-municipalities-are-there-in-south-africa',
      question: 'How many municipalities are there in South Africa?',
      answer: `South Africa has 213 local and metropolitan municipalities: ${metros.length} metros and ${all.length - metros.length} local municipalities, according to Stats SA's Census 2022 Provinces at a glance.`,
      topic: 'municipalities',
      guess: {
        question: 'How many of the 213 are in KwaZulu-Natal? Make a guess.',
        min: 0,
        max: 60,
        step: 1,
        unit: 'count',
        value: all.filter((m) => m.provinceName === 'KwaZulu-Natal').length,
        source: `${CENSUS_SOURCE.publisher}, ${CENSUS_SOURCE.title}, pages 6 to 44`,
      },
      figure: {
        kind: 'bars',
        title: `Municipalities in each province. ${byProvince(all, (m) => m.provinceName).sort((a, b) => b.items.length - a.items.length)[0].name} has the most.`,
        rows: byProvince(all, (m) => m.provinceName)
          .sort((a, b) => b.items.length - a.items.length)
          .map((p) => ({ label: p.name, href: `/provinces/${provinceSlug(p.name)}`, value: p.items.length, display: String(p.items.length), note: `${p.items.filter((m) => m.category === 'A').length} metro${p.items.filter((m) => m.category === 'A').length === 1 ? '' : 's'}` })),
      },
      method: [
        'Counted from the municipal rows of Provinces at a glance: every row with a municipal code, plus the metros.',
        'The publication says: "In 2011, there were 234 local municipalities. In 2018, the number of local municipalities reduced to 213." (page 52). Above these sit 44 district municipalities.',
      ],
      sources: [census('Person indicators per municipality, pages 6 to 44; Local municipal boundary changes, page 52')],
      related: ['how-many-district-municipalities-are-there', 'which-province-is-a-municipality-in', 'which-municipality-has-the-largest-population'],
      keywords: 'number of municipalities how many local municipalities metros 213',
    },
    {
      slug: 'how-many-district-municipalities-are-there',
      question: 'How many district municipalities are there in South Africa?',
      answer: `South Africa has ${dists.length} district municipalities, according to Stats SA's Census 2022 Provinces at a glance. The ${metros.length} metros are listed separately from the districts.`,
      topic: 'municipalities',
      figure: {
        kind: 'bars',
        title: `District municipalities in each province. ${byProvince(dists, (d) => d.province).sort((a, b) => b.items.length - a.items.length)[0].name} has the most.`,
        rows: byProvince(dists, (d) => d.province)
          .sort((a, b) => b.items.length - a.items.length)
          .map((p) => ({ label: p.name, href: `/provinces/${provinceSlug(p.name)}`, value: p.items.length, display: String(p.items.length), note: p.items.map((d) => d.name).join(', ') })),
      },
      method: [
        'Counted from the district rows of Provinces at a glance: the rows in the municipal category C1 or C2. The publication defines C1 as "District municipalities that are not water services authorities" and C2 as "District municipalities that are water services authorities" (page 1).',
      ],
      sources: [census('Person indicators per municipality, pages 6 to 44; Person table terminology, page 1')],
      related: ['how-many-municipalities-are-there-in-south-africa', 'which-province-is-a-municipality-in', 'how-many-people-live-in-the-metros'],
      keywords: 'district municipalities how many number',
    },
    {
      slug: 'which-province-is-a-municipality-in',
      question: 'Which province is a municipality in?',
      answer: `Each of South Africa's 213 municipalities is in one of the nine provinces; for example, ${bush.name} is in ${bush.provinceName}. The full list, from Stats SA's Census 2022 Provinces at a glance, is below.`,
      topic: 'municipalities',
      figure: {
        kind: 'list',
        title: 'Every municipality, by province',
        rows: [...all]
          .sort((a, b) => a.provinceName.localeCompare(b.provinceName) || a.name.localeCompare(b.name))
          .map((m) => ({ label: m.name, href: `/municipalities/${m.id}`, value: 0, display: m.provinceName, note: m.id })),
      },
      method: ['The province of each municipality is the province table it appears in, in Provinces at a glance. Codes start with the province: WC is Western Cape, MP Mpumalanga, and so on (the metros have their own codes, such as CPT).'],
      sources: [census('Person indicators per municipality, pages 6 to 44')],
      related: ['how-many-municipalities-are-there-in-south-africa', 'how-many-district-municipalities-are-there', 'which-province-has-the-most-people'],
      keywords: 'which province is bushbuckridge mkhondo in what province is municipality located',
    },
    {
      slug: 'which-municipality-has-the-largest-population',
      question: 'Which municipality has the largest population?',
      answer: `${byPop[0].name} (${byPop[0].provinceName}) has the largest population of any municipality: Census 2022 counted ${formatCount(byPop[0].population2022)} people there, according to Stats SA's Provinces at a glance.`,
      topic: 'municipalities',
      figure: { kind: 'list', title: 'The 10 municipalities with the most people, Census 2022', rows: byPop.slice(0, 10).map((m) => muniRow(m, m.population2022, formatCount(m.population2022))) },
      method: ['All 213 municipalities ranked by the Census 2022 population in the person tables of Provinces at a glance.'],
      sources: [census('Person indicators per municipality, pages 6 to 44')],
      related: ['which-municipality-has-the-smallest-population', 'how-many-people-live-in-the-metros', 'which-municipalities-grew-fastest-between-2011-and-2022'],
      keywords: 'biggest largest municipality population most people',
    },
    {
      slug: 'which-municipality-has-the-smallest-population',
      question: 'Which municipality has the smallest population?',
      answer: `${byPop[byPop.length - 1].name} in ${byPop[byPop.length - 1].provinceName} has the smallest population of any municipality: Census 2022 counted ${formatCount(byPop[byPop.length - 1].population2022)} people there, according to Stats SA's Provinces at a glance.`,
      topic: 'municipalities',
      figure: { kind: 'list', title: 'The 10 municipalities with the fewest people, Census 2022', rows: [...byPop].reverse().slice(0, 10).map((m) => muniRow(m, m.population2022, formatCount(m.population2022))) },
      method: ['All 213 municipalities ranked by the Census 2022 population in the person tables of Provinces at a glance, smallest first.'],
      sources: [census('Person indicators per municipality, pages 6 to 44')],
      related: ['which-municipality-has-the-largest-population', 'which-municipalities-lost-people-between-2011-and-2022', 'how-many-municipalities-are-there-in-south-africa'],
      keywords: 'smallest municipality fewest people population',
    },
    {
      slug: 'which-municipalities-grew-fastest-between-2011-and-2022',
      question: 'Which municipalities grew fastest between Census 2011 and Census 2022?',
      answer: `${rises[0].name} (${rises[0].provinceName}) grew fastest: its population rose ${formatDecimal(rises[0].change)}%, from ${formatCount(rises[0].value2011)} in Census 2011 to ${formatCount(rises[0].value2022)} in Census 2022, according to Stats SA's Provinces at a glance.`,
      topic: 'census',
      figure: { kind: 'list', title: 'The 10 fastest-growing municipalities, Census 2011 to 2022', rows: rises.map((c) => ({ label: c.name, href: `/municipalities/${c.id}`, value: c.change, display: `${formatSigned(c.change)}%`, note: `${c.provinceName}. ${formatCount(c.value2011)} to ${formatCount(c.value2022)}` })) },
      method: [
        'The percentage change between the two census counts for each municipality, worked out by SA Data Hub. Both counts are in Provinces at a glance, and the 2011 figures were produced for today\'s boundaries, so they cover the same area.',
      ],
      sources: [census('Person indicators per municipality, pages 6 to 44')],
      related: ['which-municipalities-lost-people-between-2011-and-2022', 'is-south-africas-population-growing', 'which-municipality-has-the-largest-population'],
      keywords: 'fastest growing municipalities growth population change 2011 2022 census',
    },
    {
      slug: 'which-municipalities-lost-people-between-2011-and-2022',
      question: 'Which municipalities lost people between Census 2011 and Census 2022?',
      answer: `${fell} of South Africa's 213 municipalities counted fewer people in Census 2022 than in Census 2011; ${falls[0].name} (${falls[0].provinceName}) fell the most, by ${formatDecimal(Math.abs(falls[0].change))}%, according to Stats SA's Provinces at a glance.`,
      topic: 'census',
      figure: { kind: 'list', title: 'The 10 largest falls in population, Census 2011 to 2022', rows: falls.map((c) => ({ label: c.name, href: `/municipalities/${c.id}`, value: c.change, display: `${formatSigned(c.change)}%`, note: `${c.provinceName}. ${formatCount(c.value2011)} to ${formatCount(c.value2022)}` })) },
      method: ['The percentage change between the two census counts for each municipality, worked out by SA Data Hub. The publication does not say why any population fell, so this page does not either.'],
      sources: [census('Person indicators per municipality, pages 6 to 44')],
      related: ['which-municipalities-grew-fastest-between-2011-and-2022', 'which-municipality-has-the-smallest-population', 'is-south-africas-population-growing'],
      keywords: 'population fell declining shrinking municipalities lost people',
    },
    {
      slug: 'what-is-the-population-of-south-africa',
      question: 'What is the population of South Africa?',
      answer: `Stats SA estimates South Africa's population at ${formatCount(MID_2026_TOTAL)} in mid-2026 (Mid-year population estimates, 2026); Census 2022 counted ${formatCount(census2022Total)} people.`,
      topic: 'population',
      figure: {
        kind: 'bars',
        title: 'Census counts and the latest mid-year estimate',
        rows: [
          { label: 'Census 2011 (count)', value: census2011Total, display: formatCount(census2011Total) },
          { label: 'Census 2022 (count)', value: census2022Total, display: formatCount(census2022Total) },
          { label: 'Mid-2026 (estimate)', value: MID_2026_TOTAL, display: formatCount(MID_2026_TOTAL) },
        ],
      },
      method: [
        'The census figures are the sum of the nine province rows in Provinces at a glance. The 2026 figure is the total of Appendix 1 of the mid-year estimates.',
        'They are different measures: Stats SA says "The mid-year estimates are an estimate of the population as of 30 June in a given year" (P0302, page 1). See why the numbers disagree on the methodology page.',
      ],
      sources: [census(`Person indicators per municipality, province rows, pages ${provPages('person')}`), MYPE],
      related: ['is-south-africas-population-growing', 'which-province-has-the-most-people', 'how-many-households-are-there-in-south-africa'],
      keywords: 'population of south africa how many people live in south africa',
    },
    {
      slug: 'is-south-africas-population-growing',
      question: "Is South Africa's population growing?",
      answer: `Yes: Census 2022 counted ${formatCount(census2022Total)} people, ${formatDecimal(popChange)}% more than the ${formatCount(census2011Total)} counted in Census 2011, according to Stats SA's Provinces at a glance.`,
      topic: 'population',
      figure: {
        kind: 'list',
        title: `Population change in each province, Census 2011 to 2022. ${growthByProv[0].name} grew fastest.`,
        rows: growthByProv.map((p) => ({ label: p.name, href: `/provinces/${provinceSlug(p.name)}`, value: p.change, display: `${formatSigned(p.change)}%`, note: `${formatCount(p.a)} to ${formatCount(p.b)}` })),
      },
      method: ['The percentage change between the two census counts, worked out by SA Data Hub from the province rows of Provinces at a glance.'],
      sources: [census(`Person indicators per municipality, province rows, pages ${provPages('person')}`)],
      related: ['what-is-the-population-of-south-africa', 'which-municipalities-grew-fastest-between-2011-and-2022', 'which-municipalities-lost-people-between-2011-and-2022'],
      keywords: 'population growing declining growth change',
    },
    {
      slug: 'how-many-people-live-in-the-metros',
      question: "How many people live in South Africa's metros?",
      answer: `${formatCount(sum(metros.map((m) => m.population2022)))} people lived in South Africa's ${metros.length} metros in Census 2022, ${formatDecimal((100 * sum(metros.map((m) => m.population2022))) / census2022Total)}% of the population; ${byPop[0].name} is the largest, according to Stats SA's Provinces at a glance.`,
      topic: 'municipalities',
      figure: { kind: 'bars', title: 'People in each metro, Census 2022', rows: [...metros].sort((a, b) => b.population2022 - a.population2022).map((m) => muniRow(m, m.population2022, formatCount(m.population2022))) },
      method: ['The Census 2022 population of the eight metropolitan municipalities, from the person tables of Provinces at a glance. The share is SA Data Hub\'s calculation, against the sum of the nine province rows.'],
      sources: [census('Person indicators per municipality, pages 6 to 44')],
      related: ['which-municipality-has-the-largest-population', 'how-many-municipalities-are-there-in-south-africa', 'what-is-the-population-of-south-africa'],
      keywords: 'population of cape town johannesburg durban ethekwini tshwane pretoria gqeberha port elizabeth nelson mandela bay ekurhuleni mangaung bloemfontein buffalo city metros cities',
    },
    {
      slug: 'which-province-has-the-most-people',
      question: 'Which province has the most people?',
      answer: `${provByPop[0].name} has the most people: Stats SA estimates ${formatCount(provByPop[0].population)} people there in mid-2026, ${formatDecimal(provByPop[0].populationShare)}% of the country (Mid-year population estimates, 2026).`,
      topic: 'population',
      guess: {
        question: 'Guess how many people Stats SA estimates live in the Northern Cape on 30 June 2026.',
        min: 0,
        max: 5_000_000,
        step: 50_000,
        unit: 'count',
        value: provinces.find((p) => p.name === 'Northern Cape')!.population,
        source: `${MYPE.publisher}, ${MYPE.title} (${MYPE.code}), ${MYPE.location}`,
      },
      figure: { kind: 'bars', title: 'People in each province, mid-2026 estimates', rows: provByPop.map((p) => ({ label: p.name, href: `/provinces/${p.id}`, value: p.population, display: formatCount(p.population), note: `${formatDecimal(p.populationShare)}% of the country` })) },
      method: ['The provincial totals in Appendix 1 of the mid-year estimates. They are estimates for 30 June 2026, not census counts.'],
      sources: [MYPE],
      related: ['what-is-the-population-of-south-africa', 'which-province-has-the-lowest-unemployment-rate', 'how-many-municipalities-are-there-in-south-africa'],
      keywords: 'largest province most people population gauteng',
    },
    {
      slug: 'what-is-the-unemployment-rate-in-south-africa',
      question: 'What is the unemployment rate in South Africa?',
      answer: `South Africa's official unemployment rate was ${unemployment.value} in the second quarter of 2026, up from 32.7% in the first quarter, according to Stats SA's Quarterly Labour Force Survey.`,
      topic: 'unemployment',
      figure: { kind: 'bars', title: 'Official unemployment rate, last nine quarters', max: 40, rows: unemploymentSeries.slice(-9).map((p) => ({ label: p.label, value: p.value, display: formatPercent(p.value) })) },
      method: [
        'The official rate (LU1) is "the proportion of the labour force that is unemployed" (QLFS, page 18). In Q2 2026 that was 8 481 000 unemployed out of a labour force of 25 220 000.',
        'Earlier quarters are from the unemployment dataset on SA Data Hub.',
      ],
      sources: [{ ...QLFS_TABLE_E, location: 'Table A, page 1' }, fromStat('unemployment-national', 'earlier quarters')],
      related: ['what-is-the-youth-unemployment-rate', 'what-is-the-expanded-unemployment-rate', 'which-province-has-the-lowest-unemployment-rate'],
      keywords: 'unemployment rate south africa qlfs q2 2026 jobless',
    },
    {
      slug: 'what-is-the-youth-unemployment-rate',
      question: 'What is the youth unemployment rate in South Africa?',
      answer: `${youth1524.value} of young people aged 15 to 24 in the labour force were unemployed in the second quarter of 2026, and ${youth.value} of those aged 15 to 34, from Stats SA's Quarterly Labour Force Survey.`,
      topic: 'unemployment',
      figure: {
        kind: 'bars',
        title: 'Unemployment rate by age, Q2 2026',
        max: 100,
        rows: [
          { label: 'Ages 15 to 24', value: youth1524.rawValue, display: youth1524.value },
          { label: 'Ages 15 to 34', value: youth.rawValue, display: youth.value },
          { label: 'Ages 15 to 64 (everyone)', value: unemployment.rawValue, display: unemployment.value },
        ],
      },
      method: [
        'The 15 to 24 rate is printed in Table 2.2 (page 26). Stats SA does not print a 15 to 34 rate, so SA Data Hub works it out from the counts in the same table: (1 764 000 + 3 233 000) unemployed ÷ (2 808 000 + 7 741 000) in the labour force = 47.4%.',
      ],
      sources: [{ ...QLFS_TABLE_E, location: 'Table 2.2, pages 26 and 27' }],
      related: ['what-is-the-unemployment-rate-in-south-africa', 'what-is-the-expanded-unemployment-rate', 'which-province-has-the-highest-unemployment-rate'],
      keywords: 'youth unemployment rate young people 15 24 15 34',
    },
    {
      slug: 'what-is-the-expanded-unemployment-rate',
      question: 'What is the expanded unemployment rate?',
      answer: `Stats SA's latest Quarterly Labour Force Survey (Q2 2026) does not publish an "expanded" unemployment rate; its broader measure is LU3, which was ${formatPercent(lu.find((r) => r.code === 'LU3')!.current.value)} against the official ${formatPercent(lu[0].current.value)}.`,
      topic: 'unemployment',
      figure: { kind: 'bars', title: 'The four labour underutilisation rates, Q2 2026', max: 100, rows: lu.map((r) => ({ label: `${r.code}: ${r.label}`, value: r.current.value, display: formatPercent(r.current.value) })) },
      method: [
        'LU3 adds the potential labour force to the unemployed: "persons who are not in the labour force, but are either available for work but not actively seeking employment or actively seeking employment but not currently available to work" (QLFS Q2 2026, page 18).',
        'Neither the Q2 2026 nor the Q4 2025 release in SA Data Hub\'s files uses the word "expanded", so this page does not give a definition or a figure for it. LU3 is a different measure.',
      ],
      sources: [{ ...QLFS_TABLE_E, location: 'Table A, page 1; Concepts and definitions, page 18' }],
      related: ['what-is-the-unemployment-rate-in-south-africa', 'what-is-the-youth-unemployment-rate', 'which-province-has-the-highest-unemployment-rate'],
      keywords: 'expanded unemployment rate lu3 broad definition',
    },
    {
      slug: 'which-province-has-the-lowest-unemployment-rate',
      question: 'Which province has the lowest unemployment rate?',
      answer: `${provByRate[0].name} had the lowest official unemployment rate in the second quarter of 2026, at ${formatPercent(provByRate[0].unemploymentRate)}, according to Stats SA's Quarterly Labour Force Survey.`,
      topic: 'unemployment',
      figure: { kind: 'bars', title: 'Official unemployment rate by province, Q2 2026, lowest first', max: 60, rows: provByRate.map((p) => ({ label: p.name, href: `/provinces/${p.id}`, value: p.unemploymentRate, display: formatPercent(p.unemploymentRate) })) },
      method: ['The provincial official unemployment rates in Table E of the release. The ranking is SA Data Hub\'s.'],
      sources: [QLFS_TABLE_E],
      related: ['which-province-has-the-highest-unemployment-rate', 'what-is-the-unemployment-rate-in-south-africa', 'which-province-has-the-most-people'],
      keywords: 'lowest unemployment province western cape',
    },
    {
      slug: 'which-province-has-the-highest-unemployment-rate',
      question: 'Which province has the highest unemployment rate?',
      answer: `${provByRate[provByRate.length - 1].name} had the highest official unemployment rate in the second quarter of 2026, at ${formatPercent(provByRate[provByRate.length - 1].unemploymentRate)}, according to Stats SA's Quarterly Labour Force Survey.`,
      topic: 'unemployment',
      figure: { kind: 'bars', title: 'Official unemployment rate by province, Q2 2026, highest first', max: 60, rows: [...provByRate].reverse().map((p) => ({ label: p.name, href: `/provinces/${p.id}`, value: p.unemploymentRate, display: formatPercent(p.unemploymentRate), note: `${p.stats.unemployment.change > 0 ? 'Up' : p.stats.unemployment.change < 0 ? 'Down' : 'No change'} ${formatDecimal(Math.abs(p.stats.unemployment.change))} pts from Q1 2026` })) },
      method: ['The provincial official unemployment rates and quarterly changes in Table E of the release.'],
      sources: [QLFS_TABLE_E],
      related: ['which-province-has-the-lowest-unemployment-rate', 'what-is-the-youth-unemployment-rate', 'what-is-the-unemployment-rate-in-south-africa'],
      keywords: 'highest unemployment province eastern cape',
    },
    {
      slug: 'what-is-the-interest-rate-in-south-africa',
      question: 'What is the interest rate in South Africa?',
      answer: `The South African Reserve Bank's repo rate is ${repo.value}, set at the Monetary Policy Committee meeting of September 2026; the prime lending rate is ${prime.value}.`,
      topic: 'inflation',
      figure: { kind: 'bars', title: 'Repo rate after each MPC decision', max: 10, rows: repo.series![0].data.slice(-9).map((p) => ({ label: p.label, value: p.value, display: `${p.value.toFixed(2)}%` })) },
      method: [`The repo rate is the rate the Reserve Bank sets at its Monetary Policy Committee meetings. The prime lending rate in the same record is ${prime.value}, ${formatDecimal(prime.rawValue - repo.rawValue)} points above the repo rate.`],
      sources: [{ ...fromStat('repo-rate-sarb', 'repo and prime rates'), publisher: 'South African Reserve Bank (SARB)' }],
      related: ['what-is-the-inflation-rate-in-south-africa', 'what-is-the-unemployment-rate-in-south-africa', 'what-is-the-population-of-south-africa'],
      keywords: 'interest rate repo rate prime lending rate sarb current',
    },
    {
      slug: 'what-is-the-inflation-rate-in-south-africa',
      question: 'What is the inflation rate in South Africa?',
      answer: `Consumer prices were ${formatPercent(cpi.headline.annual.value)} higher in September 2026 than a year earlier, up from ${formatPercent(cpi.headline.previousAnnual.value)} in August, according to Stats SA's Consumer Price Index.`,
      topic: 'inflation',
      figure: {
        kind: 'bars',
        title: 'What added most to the annual rate in September 2026, in percentage points',
        max: 2,
        rows: cpi.contributions.slice(0, 6).map((c) => ({ label: c.group, value: c.current.value, display: `${formatDecimal(c.current.value)} pts` })),
      },
      method: ['The headline annual rate compares prices with the same month a year earlier. The contributions are from Table C of the release (page 5) and add up to the headline rate.'],
      sources: [{ publisher: 'Stats SA', title: 'Consumer Price Index, September 2026', code: 'P0141', location: 'Key findings, page 2; Table C, page 5', releasedOn: '2026-10-21', checkedOn: cpi.headline.annual.checkedOn }],
      related: ['what-is-the-interest-rate-in-south-africa', 'what-is-the-unemployment-rate-in-south-africa', 'how-many-households-are-there-in-south-africa'],
      keywords: 'inflation rate cpi consumer prices',
    },
    {
      slug: 'how-many-households-are-there-in-south-africa',
      question: 'How many households are there in South Africa?',
      answer: `Census 2022 counted ${formatCount(households2022)} households in South Africa, up from ${formatCount(households2011)} in Census 2011, according to Stats SA's Provinces at a glance.`,
      topic: 'housing',
      figure: {
        kind: 'bars',
        title: 'Households in each province, Census 2022',
        rows: [...pRows].sort((a, b) => b.housing1.values[2] - a.housing1.values[2]).map((p) => ({ label: p.name, href: `/provinces/${provinceSlug(p.name)}`, value: p.housing1.values[2], display: formatCount(p.housing1.values[2]), note: `${formatCount(p.housing1.values[0])} in 2011` })),
      },
      method: ['The sum of the nine province rows of the housing table in Provinces at a glance, worked out by SA Data Hub.'],
      sources: [census(`General housing information per municipality (1), province rows, pages ${provPages('housing1')}`)],
      related: ['how-many-people-live-in-a-household', 'which-province-has-the-most-formal-dwellings', 'what-is-the-population-of-south-africa'],
      keywords: 'number of households how many households',
    },
    {
      slug: 'how-many-people-live-in-a-household',
      question: 'How many people live in a household in South Africa?',
      answer: `About ${formatDecimal(nationalSize2022)} people per household in Census 2022, down from ${formatDecimal(nationalSize2011)} in Census 2011, worked out from Stats SA's Provinces at a glance.`,
      topic: 'housing',
      figure: { kind: 'bars', title: 'Average household size by province, Census 2022', max: 5, rows: sizeByProv.map((p) => ({ label: p.name, href: `/provinces/${provinceSlug(p.name)}`, value: p.v2022, display: formatDecimal(p.v2022), note: `${formatDecimal(p.v2011)} in 2011` })) },
      method: ['The provincial averages are printed in the housing table. The national figure is SA Data Hub\'s: the population divided by the number of households, both summed over the nine provinces.'],
      sources: [census(`General housing information per municipality (1), province rows, pages ${provPages('housing1')}`)],
      related: ['how-many-households-are-there-in-south-africa', 'which-province-has-the-most-formal-dwellings', 'is-south-africas-population-growing'],
      keywords: 'household size people per household average',
    },
    {
      slug: 'which-municipalities-have-the-most-households-without-a-toilet',
      question: 'Which municipalities have the most households without a toilet?',
      answer: `In ${noToilet[0].name} (${noToilet[0].provinceName}), ${formatPercent(noToilet[0].pctNoToilet2022)} of households had no toilet in Census 2022, the highest share of any municipality, according to Stats SA's Provinces at a glance.`,
      topic: 'housing',
      figure: { kind: 'list', title: 'The 10 highest shares of households with no toilet, Census 2022', rows: noToilet.slice(0, 10).map((m) => muniRow(m, m.pctNoToilet2022, formatPercent(m.pctNoToilet2022), `${m.provinceName}. ${formatCount(m.serviceDetail.noToilet2022)} households`)) },
      method: ['The share of households with no toilet facility, out of all households in the toilet table of Provinces at a glance, worked out by SA Data Hub.'],
      sources: [census('General housing information per municipality (2), pages 9 to 47')],
      related: ['which-province-has-the-most-formal-dwellings', 'how-many-households-are-there-in-south-africa', 'which-municipalities-grew-fastest-between-2011-and-2022'],
      keywords: 'no toilet sanitation households without toilet',
    },
    {
      slug: 'which-province-has-the-most-formal-dwellings',
      question: 'Which province has the highest share of households in formal dwellings?',
      answer: `${formalByProv[0].name} had the highest share: ${formatPercent(formalByProv[0].v2022)} of households lived in a formal dwelling in Census 2022, worked out from Stats SA's Provinces at a glance.`,
      topic: 'housing',
      figure: { kind: 'bars', title: 'Households in a formal dwelling by province, Census 2022', max: 100, rows: formalByProv.map((p) => ({ label: p.name, href: `/provinces/${provinceSlug(p.name)}`, value: p.v2022, display: formatPercent(p.v2022), note: `${formatPercent(p.v2011)} in 2011` })) },
      method: ['Formal dwellings divided by all dwellings (formal, traditional, informal and other) in the province rows of the housing table, worked out by SA Data Hub. A formal dwelling includes a house, a flat, a townhouse and a room in a backyard (page 3).'],
      sources: [census(`General housing information per municipality (1), province rows, pages ${provPages('housing1')}`)],
      related: ['how-many-households-are-there-in-south-africa', 'which-municipalities-have-the-most-households-without-a-toilet', 'how-many-people-live-in-a-household'],
      keywords: 'formal dwellings housing province brick house',
    },
  ]
}

export const ANSWERS: Answer[] = build()

export function getAnswer(slug: string): Answer | undefined {
  return ANSWERS.find((a) => a.slug === slug)
}

export const ANSWERS_PATH = '/answers'
