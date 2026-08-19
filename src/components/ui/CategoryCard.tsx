import Link from 'next/link'
import {
  Briefcase, TrendingUp, ShoppingCart, Shield,
  GraduationCap, Users, Home, BarChart3, LucideIcon,
} from 'lucide-react'
import { Category } from '@/types'
import { cn } from '@/lib/utils'

const iconMap: Record<string, LucideIcon> = {
  Briefcase, TrendingUp, ShoppingCart, Shield,
  GraduationCap, Users, Home, BarChart3,
}

interface CategoryCardProps {
  category: Category
}

export function CategoryCard({ category }: CategoryCardProps) {
  const Icon = iconMap[category.icon] ?? BarChart3
  return (
    <Link
      href={`/category/${category.id}`}
      className="card group flex flex-col gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      aria-label={`${category.label} — ${category.stats} dataset${category.stats !== 1 ? 's' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', category.bgColor)}>
          <Icon size={22} className={category.color} aria-hidden="true" />
        </div>
        {/* Dataset count badge */}
        <span className="mt-0.5 shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {category.stats} {category.stats !== 1 ? 'datasets' : 'dataset'}
        </span>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
          {category.label}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {category.description}
        </p>
      </div>
    </Link>
  )
}
