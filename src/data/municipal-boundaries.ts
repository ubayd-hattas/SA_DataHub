/**
 * Municipalities whose boundaries changed between Census 2011 and the 2016
 * local government elections, so their 2011 and 2022 figures are not
 * compared on the site.
 *
 * Source: Municipal Demarcation Board, "Reflections on 20 years of
 * Demarcation" (2019), pages 37 to 40, which lists the redeterminations
 * approved in 2015 and effective from the August 2016 elections
 * (https://www.demarcation.org.za/wp-content/uploads/2019/02/Book-Reflections-on-20-years-of-Demarcation.pdf).
 * The Board's 2016/17 annual report records that no major redeterminations
 * followed before 2021. Codes are matched to the current municipalities in
 * municipalities.json (research notes, 25 October 2026).
 *
 * Known gaps: the same book says about 74 other municipalities had slight
 * boundary changes but does not name them, and the 2013 KwaZulu-Natal
 * mergers (61 to 54 local municipalities) are not itemised in the documents
 * checked. Those municipalities are not on this list.
 */

export const BOUNDARY_SOURCE = {
  publisher: 'Municipal Demarcation Board',
  title: 'Reflections on 20 years of Demarcation',
  year: 2019,
  pages: '37 to 40',
  url: 'https://www.demarcation.org.za/wp-content/uploads/2019/02/Book-Reflections-on-20-years-of-Demarcation.pdf',
}

export type BoundaryChange = 'merged' | 'redrawn'

/** Formed from, or enlarged by, a merger; or gained or lost part of its area. */
export const BOUNDARY_CHANGED_SINCE_2011: Record<string, BoundaryChange> = {
  EC145: 'merged', // Walter Sisulu
  EC129: 'merged', // Raymond Mhlaba
  EC101: 'merged', // Dr Beyers Naude
  EC139: 'merged', // Enoch Mgijima
  MAN: 'merged', // Mangaung (Naledi merged into it)
  LIM476: 'merged', // Fetakgomo Tubatse
  LIM368: 'merged', // Modimolle-Mookgophong
  MP326: 'merged', // City of Mbombela
  NC087: 'merged', // Dawid Kruiper
  NW405: 'merged', // JB Marks
  GT485: 'merged', // Rand West City
  LIM341: 'redrawn', // Musina
  LIM343: 'redrawn', // Thulamela
  LIM344: 'redrawn', // Makhado
  LIM345: 'redrawn', // Collins Chabane (new in 2016)
  LIM354: 'redrawn', // Polokwane
  LIM353: 'redrawn', // Molemole
  LIM351: 'redrawn', // Blouberg
  KZN245: 'redrawn', // Umvoti
  KZN223: 'redrawn', // Mpofana
}

/** True when the 2011 and 2022 figures cover the same area, as far as the sources show. */
export function has2011Comparison(code: string): boolean {
  return !(code in BOUNDARY_CHANGED_SINCE_2011)
}
