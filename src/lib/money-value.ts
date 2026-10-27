/**
 * The money value tool at /tools/money-value. The year and amount come from
 * the URL (?year=1994&amount=100) so an answer can be linked and shared.
 */
import { VALUE_YEARS, valueToday, type ValueResult } from '@/lib/cpi-history'
import { formatRand } from '@/lib/format'

export const MONEY_VALUE_PATH = '/tools/money-value'
export const DEFAULT_YEAR = 2000
export const DEFAULT_AMOUNT = 100
/** Larger amounts are accepted by the maths but make no sense to share. */
export const MAX_AMOUNT = 1_000_000_000

export interface MoneyValueQuery {
  year: number
  amount: number
  /** False when the URL asked for something we replaced with a default. */
  yearValid: boolean
  amountValid: boolean
}

type Params = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** "100", "1 000" and "1,000.50" all read as amounts. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[\s, ]/g, '').replace(/^R/i, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const n = Number(cleaned)
  return n <= MAX_AMOUNT ? n : null
}

export function parseMoneyValueQuery(params: Params): MoneyValueQuery {
  const yearText = first(params.year)
  const amountText = first(params.amount)
  const year = Number(yearText)
  const yearValid = yearText === undefined || VALUE_YEARS.includes(year)
  const amount = amountText === undefined ? null : parseAmount(amountText)
  const amountValid = amountText === undefined || amount !== null
  return {
    year: yearText !== undefined && yearValid ? year : DEFAULT_YEAR,
    amount: amount ?? DEFAULT_AMOUNT,
    yearValid,
    amountValid,
  }
}

/** The link to an answer. */
export function moneyValueHref(year: number, amount: number): string {
  return `${MONEY_VALUE_PATH}?year=${year}&amount=${amount}`
}

/** Whole rands for the answer; cents only when the input had them. */
export function formatInputRand(amount: number): string {
  return formatRand(amount, Number.isInteger(amount) ? 0 : 2)
}

/** "R100 in 1994 had about the same buying power as R765 in Sep 2026." */
export function moneyValueSentence(result: ValueResult): string {
  return `${formatInputRand(result.amount)} in ${result.year} had about the same buying power as ${formatRand(result.equivalent, 0)} in ${result.nowLabel}.`
}

export function moneyValueResult(query: Pick<MoneyValueQuery, 'year' | 'amount'>): ValueResult {
  // The query is validated, so a result always exists.
  return valueToday(query.year, query.amount)!
}
