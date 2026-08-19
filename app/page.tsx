'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { SearchBar } from '@/components/search-bar'
import { FilterChips } from '@/components/filter-chips'
import { EMPTY_FILTERS, FilterSheet, type Filters } from '@/components/filter-sheet'
import { JobCard } from '@/components/job-card'
import { ImpactBanner } from '@/components/impact-banner'
import { DevContact } from '@/components/dev-contact'
import { JobListSkeleton } from '@/components/job-list-skeleton'
import { EmptyState } from '@/components/empty-state'
import { ALL_OPTION } from '@/lib/data'
import { useCatalog } from '@/lib/use-catalog'
import { useJobFeed } from '@/lib/use-job-feed'
import { useSavedJobs } from '@/lib/use-saved-jobs'

export default function HomePage() {
  const { cities, categories } = useCatalog()
  const { toggle, isSaved } = useSavedJobs()

  // La ciudad se queda fuera de la hoja: es el eje principal del tablón y
  // conviene poder cambiarla de un toque, sin abrir nada.
  const [query, setQuery] = useState('')
  const [city, setCity] = useState(ALL_OPTION)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  const cityOptions = useMemo(
    () => [ALL_OPTION, ...cities.map((c) => c.name)],
    [cities],
  )

  const selectedCityId = useMemo(
    () => cities.find((c) => c.name === city)?.id,
    [cities, city],
  )

  const { jobs, total, state, hasMore, loadingMore, sentinelRef } = useJobFeed({
    query: query.trim() || undefined,
    city: selectedCityId,
    category: filters.category ?? undefined,
    type: filters.type ?? undefined,
    urgent: filters.urgent ? true : undefined,
  })

  return (
    <div className="flex flex-col gap-4">
      <AppHeader
        title="Encuentra empleo cerca"
        subtitle="Pereira · Dosquebradas · Santa Rosa"
      />

      <SearchBar
        value={query}
        onChange={setQuery}
        filters={
          <FilterSheet
            categories={categories}
            value={filters}
            onChange={setFilters}
            resultCount={state === 'ready' ? total : undefined}
          />
        }
      />

      <ImpactBanner />

      <div className="flex flex-col gap-2">
        <p className="px-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Ciudad
        </p>
        <FilterChips options={cityOptions} value={city} onChange={setCity} label="Ciudad" />
      </div>

      <div className="flex items-center justify-between px-5">
        <h2 className="font-display text-lg font-bold">
          {state === 'ready' ? `${total} ${total === 1 ? 'vacante' : 'vacantes'}` : 'Vacantes'}
        </h2>
        <span className="text-sm font-medium text-muted-foreground">Más recientes</span>
      </div>

      <div className="flex flex-col gap-3 px-5">
        {state === 'loading' ? <JobListSkeleton /> : null}

        {state === 'error' ? (
          <EmptyState
            title="No pudimos cargar las vacantes"
            description="Revisa tu conexión e inténtalo de nuevo en un momento."
          />
        ) : null}

        {state === 'ready' && jobs.length === 0 ? (
          <EmptyState
            title="Sin resultados"
            description="Prueba con otra ciudad o categoría."
          />
        ) : null}

        {state === 'ready'
          ? jobs.map((job) => (
              <JobCard key={job.id} job={job} saved={isSaved(job.id)} onToggleSave={toggle} />
            ))
          : null}

        {/*
          Marca invisible al final de la lista: cuando entra en pantalla —o se
          acerca— el feed pide la página siguiente. Solo existe mientras queda
          algo que pedir, así que al llegar al final el observador se suelta.
        */}
        {state === 'ready' && hasMore ? <div ref={sentinelRef} aria-hidden="true" /> : null}

        {loadingMore ? (
          <div className="flex items-center justify-center gap-2 py-4 text-sm font-medium text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Cargando más vacantes…
          </div>
        ) : null}

        {state === 'ready' && !hasMore && jobs.length > 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Ya viste todas las vacantes.
          </p>
        ) : null}
      </div>

      <DevContact />
    </div>
  )
}
