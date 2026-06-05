import Link from 'next/link'
import { Info } from 'lucide-react'
import { getAllMunicipalities } from '@/data/mock'
import MunicipalityExplorer from './MunicipalityExplorer'

export const metadata = {
  title: 'Municipality Explorer | SA Data Hub',
  description:
    'Browse and search all 213 South African municipalities. Population, households, and key Census 2022 indicators by province.',
}

export default function MunicipalitiesPage() {
  const municipalities = getAllMunicipalities()

  return (
    <div className="container-page py-10 space-y-10">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
          <Link href="/" className="hover:text-brand-600 transition-colors">Home</Link>
          <span>/</span>
          <span>Municipalities</span>
        </div>
        <h1 className="font-display text-3xl font-semibold text-slate-900 dark:text-white mb-2">
          Municipality Explorer
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
          Search and filter all 213 South African municipalities. Population and household data
          from Census 2022, sourced from Statistics South Africa Municipal Fact Sheets.
        </p>
      </div>

      {/* Client-side explorer — search, filter, paginate */}
      <MunicipalityExplorer municipalities={municipalities} />

      {/* Footer note */}
      <div className="flex items-start gap-2 text-xs text-slate-400 dark:text-slate-500">
        <Info size={13} className="shrink-0 mt-0.5" />
        <p>
          All data from Stats SA Census 2022 Municipal Fact Sheets (revised August 2025).
          Population and household figures are boundary-aligned to 2021 local government election boundaries.
          Category A = metropolitan municipalities, B = local municipalities, C = district municipalities.
        </p>
      </div>
    </div>
  )
}
