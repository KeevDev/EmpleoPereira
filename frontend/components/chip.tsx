'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Opción en forma de píldora dentro de una hoja.
 *
 * Se distingue de `FilterChips` en que aquí cada opción es un botón suelto:
 * sirve tanto para elegir una sola cosa como para marcar varias, y por eso
 * expone `aria-pressed` en lugar del rol de pestaña.
 */
export function Chip({
  activa,
  onClick,
  children,
}: {
  activa: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
        activa
          ? 'bg-foreground text-background'
          : 'border border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {activa ? <Check className="size-3.5" /> : null}
      {children}
    </button>
  )
}
