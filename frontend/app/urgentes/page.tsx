'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { FilterChips } from '@/components/filter-chips'
import { JobCard } from '@/components/job-card'
import { JobListSkeleton } from '@/components/job-list-skeleton'
import { EmptyState } from '@/components/empty-state'
import { DevContact } from '@/components/dev-contact'
import { fetchJobs } from '@/lib/api'
import { ALL_OPTION } from '@/lib/data'
import { useCatalog } from '@/lib/use-catalog'
import { useSavedJobs } from '@/lib/use-saved-jobs'
import type { Job } from '@/lib/types'

/**
 * Vacantes marcadas como urgentes.
 *
 * El filtro lo aplica la API (?urgent=1), no el cliente: así no se descargan
 * cien vacantes para mostrar tres.
 */
export default function UrgentesPage() {
  const { cities } = useCatalog()
  const { toggle, isSaved } = useSavedJobs()

  const [city, setCity] = useState(ALL_OPTION)
  const [jobs, setJobs] = useState<Job[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  const cityOptions = useMemo(() => [ALL_OPTION, ...cities.map((c) => c.name)], [cities])

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')

    fetchJobs(
      {
        urgent: true,
        city: cities.find((c) => c.name === city)?.id,
        perPage: 50,
      },
      controller.signal,
    )
      .then((page) => {
        setJobs(page.items)
        setState('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('error')
      })

    return () => controller.abort()
  }, [city, cities])

  return (
    <div className="flex flex-col gap-4">
      <AppHeader
        title="Vacantes urgentes"
        subtitle="Empleos que necesitan cubrirse ya"
        action={<span />}
      />

      <div className="mx-5 flex items-start gap-3 rounded-3xl border border-primary/25 bg-primary/10 px-4 py-3.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Zap className="size-4" strokeWidth={2.5} />
        </span>
        <p className="text-sm text-pretty text-muted-foreground">
          Quien publica marca aquí lo que no puede esperar. Si te interesa alguna, contacta hoy
          mismo.
        </p>
      </div>

      <FilterChips options={cityOptions} value={city} onChange={setCity} label="Ciudad" />

      <div className="flex items-center justify-between px-5">
        <h2 className="font-display text-lg font-bold">
          {state === 'ready'
            ? `${jobs.length} ${jobs.length === 1 ? 'urgente' : 'urgentes'}`
            : 'Urgentes'}
        </h2>
      </div>

      <div className="flex flex-col gap-3 px-5">
        {state === 'loading' ? <JobListSkeleton count={2} /> : null}

        {state === 'error' ? (
          <EmptyState
            title="No pudimos cargar las vacantes"
            description="Revisa tu conexión e inténtalo de nuevo en un momento."
          />
        ) : null}

        {state === 'ready' && jobs.length === 0 ? (
          <EmptyState
            title="No hay vacantes urgentes"
            description={
              city === ALL_OPTION
                ? 'Ahora mismo ninguna oferta está marcada como urgente.'
                : `Ninguna oferta urgente en ${city} por ahora.`
            }
            action={
              <Link
                href="/"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
              >
                Ver todas las vacantes
              </Link>
            }
          />
        ) : null}

        {state === 'ready'
          ? jobs.map((job) => (
              <JobCard key={job.id} job={job} saved={isSaved(job.id)} onToggleSave={toggle} />
            ))
          : null}
      </div>

      <DevContact />
    </div>
  )
}
