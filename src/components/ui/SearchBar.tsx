'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  placeholder?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  onSearch?: (query: string) => void
}

export function SearchBar({
  placeholder = 'Search statistics, categories…',
  className,
  size = 'md',
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!query.trim()) return
      if (onSearch) {
        onSearch(query)
      } else {
        router.push(`/dashboard?search=${encodeURIComponent(query)}`)
      }
    },
    [query, onSearch, router]
  )

  const sizes = {
    sm: 'h-9 text-sm pl-9 pr-8',
    md: 'h-11 text-sm pl-10 pr-10',
    lg: 'h-14 text-base pl-12 pr-12',
  }

  const iconSizes = { sm: 14, md: 16, lg: 20 }

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <Search
        size={iconSizes[size]}
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400',
          size === 'sm' && 'left-3',
          size === 'md' && 'left-3.5',
          size === 'lg' && 'left-4'
        )}
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          'w-full rounded-xl border border-slate-200 bg-white font-sans text-slate-900 placeholder-slate-400 shadow-sm outline-none',
          'transition-all focus:border-brand-400 focus-visible:ring-2 focus-visible:ring-accent',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-brand-500',
          sizes[size]
        )}
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200',
            size === 'sm' && 'right-2.5',
            size === 'md' && 'right-3.5',
            size === 'lg' && 'right-4'
          )}
        >
          <X size={iconSizes[size]} />
        </button>
      )}
    </form>
  )
}
