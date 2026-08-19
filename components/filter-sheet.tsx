'use client'

import { Dialog } from '@base-ui/react/dialog'
import { SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SheetContent } from '@/components/bottom-sheet'
import { Chip } from '@/components/chip'
import { JOB_TYPES } from '@/lib/data'
import type { Category, JobTypeSlug } from '@/lib/types'

export type Filters = {
  /** Slug de categoría, o null para todas. */
  category: string | null
  type: JobTypeSlug | null
  urgent: boolean
}

export const EMPTY_FILTERS: Filters = { category: null, type: null, urgent: false }

export function activeFilterCount(filters: Filters): number {
  return (
    (filters.category !== null ? 1 : 0) + (filters.type !== null ? 1 : 0) + (filters.urgent ? 1 : 0)
  )
}

/**
 * El botón de filtros y su hoja.
 *
 * Los cambios no se aplican al tocar: se acumulan en un borrador y salen al
 * pulsar "Ver vacantes". Cada cambio suelto sería una consulta contra el
 * límite por IP, y en un móvil se toca mucho antes de decidir.
 */
export function FilterSheet({
  categories,
  value,
  onChange,
  resultCount,
}: {
  categories: Category[]
  value: Filters
  onChange: (filters: Filters) => void
  /** Vacantes que hay con los filtros ya aplicados, para el botón. */
  resultCount?: number
}) {
  const [abierta, setAbierta] = useState(false)
  const [borrador, setBorrador] = useState<Filters>(value)

  // Al abrir se parte de lo que está aplicado, no de lo que quedó a medias
  // la última vez que se cerró sin confirmar.
  useEffect(() => {
    if (abierta) setBorrador(value)
  }, [abierta, value])

  const activos = activeFilterCount(value)

  const aplicar = () => {
    onChange(borrador)
    setAbierta(false)
  }

  const limpiar = () => setBorrador(EMPTY_FILTERS)

  return (
    <Dialog.Root open={abierta} onOpenChange={setAbierta}>
      <Dialog.Trigger
        aria-label={activos > 0 ? `Filtros (${activos} activos)` : 'Filtros'}
        className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/30 transition-transform active:scale-95"
      >
        <SlidersHorizontal className="size-5" />

        {activos > 0 ? (
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-foreground text-[0.6875rem] font-bold text-background ring-2 ring-background">
            {activos}
          </span>
        ) : null}
      </Dialog.Trigger>

      <SheetContent
        title="Filtros"
        description="Afina lo que ves en el tablón."
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={limpiar}
              disabled={activeFilterCount(borrador) === 0}
              className="rounded-full border border-border bg-card px-5 py-3.5 text-sm font-bold text-foreground disabled:opacity-40"
            >
              Limpiar
            </button>

            <button
              type="button"
              onClick={aplicar}
              className="flex-1 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30"
            >
              {resultCount !== undefined && sonIguales(borrador, value)
                ? `Ver ${resultCount} ${resultCount === 1 ? 'vacante' : 'vacantes'}`
                : 'Ver vacantes'}
            </button>
          </div>
        }
      >
        {categories.length > 0 ? (
          <Grupo titulo="Categoría">
            <Chip
              activa={borrador.category === null}
              onClick={() => setBorrador((b) => ({ ...b, category: null }))}
            >
              Todas
            </Chip>

            {categories.map((categoria) => (
              <Chip
                key={categoria.slug}
                activa={borrador.category === categoria.slug}
                onClick={() =>
                  setBorrador((b) => ({
                    ...b,
                    category: b.category === categoria.slug ? null : categoria.slug,
                  }))
                }
              >
                {categoria.name}
              </Chip>
            ))}
          </Grupo>
        ) : null}

        <Grupo titulo="Tipo de contrato">
          <Chip
            activa={borrador.type === null}
            onClick={() => setBorrador((b) => ({ ...b, type: null }))}
          >
            Cualquiera
          </Chip>

          {JOB_TYPES.map((tipo) => (
            <Chip
              key={tipo.slug}
              activa={borrador.type === tipo.slug}
              onClick={() =>
                setBorrador((b) => ({ ...b, type: b.type === tipo.slug ? null : tipo.slug }))
              }
            >
              {tipo.label}
            </Chip>
          ))}
        </Grupo>

        <Grupo titulo="Urgencia">
          <Chip
            activa={borrador.urgent}
            onClick={() => setBorrador((b) => ({ ...b, urgent: !b.urgent }))}
          >
            Solo urgentes
          </Chip>
        </Grupo>
      </SheetContent>
    </Dialog.Root>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function sonIguales(a: Filters, b: Filters): boolean {
  return a.category === b.category && a.type === b.type && a.urgent === b.urgent
}
