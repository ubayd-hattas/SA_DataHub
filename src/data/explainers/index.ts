import type { Explainer } from '@/lib/explainers'
import { cpi202609 } from './cpi-2026-09'

/** All published explainers, newest first. */
export const EXPLAINERS: Explainer[] = [cpi202609]

export function getExplainerBySlug(slug: string): Explainer | undefined {
  return EXPLAINERS.find((e) => e.slug === slug)
}
