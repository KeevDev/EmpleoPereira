'use client'

import { cn } from '@/lib/utils'

export function FilterChips({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly string[]
  value?: string
  onChange?: (value: string) => void
  label?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-1"
    >
      {options.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange?.(option)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              active
                ? 'bg-foreground text-background'
                : 'border border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
