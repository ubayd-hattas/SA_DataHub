import type { Explainer } from '@/lib/explainers'
import { cpi202609 } from './cpi-2026-09'
import { qlfs2026q2 } from './qlfs-2026-q2'

/** All published explainers, newest release first. */
export const EXPLAINERS: Explainer[] = [cpi202609, qlfs2026q2]

export function getExplainerBySlug(slug: string): Explainer | undefined {
  return EXPLAINERS.find((e) => e.slug === slug)
}
