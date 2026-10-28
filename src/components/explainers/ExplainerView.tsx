import { CpiExplainerView } from '@/components/explainers/CpiExplainerView'
import { QlfsExplainerView } from '@/components/explainers/QlfsExplainerView'
import { isCpi, type Explainer } from '@/lib/explainers'

/** The page for any explainer, by kind. */
export function ExplainerView({ explainer }: { explainer: Explainer }) {
  return isCpi(explainer) ? <CpiExplainerView explainer={explainer} /> : <QlfsExplainerView explainer={explainer} />
}
