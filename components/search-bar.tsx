'use client'

import { Search } from 'lucide-react'

/**
 * Caja de búsqueda, con un hueco al lado para el botón de filtros.
 *
 * El botón llega desde fuera en vez de vivir aquí dentro porque abre una
 * hoja con su propio estado: la barra no tiene por qué saber qué se filtra
 * ni cuántos filtros hay puestos.
 */
export function SearchBar({
  value,
  onChange,
  filters,
  placeholder = 'Buscar vacante, empresa...',
}: {
  value?: string
  onChange?: (value: string) => void
  filters?: React.ReactNode
  placeholder?: string
}) {
  return (
    <div className="flex items-center gap-2.5 px-5">
      <div className="flex flex-1 items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input
          type="search"
          inputMode="search"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
      {filters}
    </div>
  )
}
