/**
 * The questions on the homepage, each with its answer's number where one
 * figure answers it. Fuel comes first because it is the number people check
 * every month, then the headline rates, then two questions about
 * municipalities taken from the earlier Search Console list. Every number comes from the same records as
 * the headline tiles, so the two never disagree.
 */
import { ANSWERS_PATH, getAnswer } from '@/data/answers'
import { FUEL_PATH } from '@/lib/fuel-page'
import { fuelSeriesId } from '@/lib/fuel'
import type { HeadlineNumber } from '@/lib/headline-numbers'

export interface HomeQuestion {
  question: string
  href: string
  /** The answer's figure, when one number answers the question. */
  value?: string
  /** The period and source of that figure. */
  detail?: string
}

// `measure` names the figure where the question alone could mean another one.
const ANSWER_ROWS: { slug: string; statId?: string; measure?: string }[] = [
  { slug: 'what-is-the-unemployment-rate-in-south-africa', statId: 'unemployment-national' },
  { slug: 'what-is-the-inflation-rate-in-south-africa', statId: 'cpi-headline' },
  { slug: 'what-is-the-interest-rate-in-south-africa', statId: 'repo-rate-sarb', measure: 'Repo rate' },
  { slug: 'how-many-municipalities-are-there-in-south-africa' },
  { slug: 'how-many-people-live-in-the-metros' },
]

export function homeQuestions(headline: HeadlineNumber[]): HomeQuestion[] {
  const byId = new Map(headline.map((n) => [n.statId, n]))
  const petrol = byId.get(fuelSeriesId('petrol95', 'inland'))
  const rows: HomeQuestion[] = [
    {
      question: 'What does petrol cost this month?',
      href: FUEL_PATH,
      ...(petrol ? { value: petrol.value, detail: `95, inland, ${petrol.period}. ${petrol.sourceShort}` } : {}),
    },
  ]
  for (const { slug, statId, measure } of ANSWER_ROWS) {
    const answer = getAnswer(slug)
    if (!answer) throw new Error(`Homepage: no answer "${slug}"`)
    const n = statId ? byId.get(statId) : undefined
    if (statId && !n) throw new Error(`Homepage: no headline number "${statId}"`)
    rows.push({
      question: answer.question,
      href: `${ANSWERS_PATH}/${slug}`,
      ...(n ? { value: n.value, detail: `${measure ? `${measure}, ` : ''}${n.period}. ${n.sourceShort}` } : {}),
    })
  }
  return rows
}
