'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, LocateFixed, X } from 'lucide-react'
import { FilterChips } from '@/components/filter-chips'
import { JobCard } from '@/components/job-card'
import { DevContactButton } from '@/components/dev-contact'
import { fetchJobs } from '@/lib/api'
import { ALL_OPTION } from '@/lib/data'
import { distanceKm, formatDistance } from '@/lib/geo'
import { useCatalog } from '@/lib/use-catalog'
import { geolocationMessage, useGeolocation } from '@/lib/use-geolocation'
import { useSavedJobs } from '@/lib/use-saved-jobs'
import type { Job } from '@/lib/types'

// Leaflet necesita el navegador: se carga sin SSR.
const JobsMap = dynamic(() => import('@/components/jobs-map'), {
  ssr: false,
  loading: () => (
    <div className="grid size-full place-items-center bg-muted">
      <span className="text-sm font-medium text-muted-foreground">Cargando mapa…</span>
    </div>
  ),
})

export default function MapaPage() {
  const { cities } = useCatalog()
  const { toggle, isSaved } = useSavedJobs()
  const { position, status, request, clear } = useGeolocation()

  const [city, setCity] = useState(ALL_OPTION)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])

  const cityOptions = useMemo(() => [ALL_OPTION, ...cities.map((c) => c.name)], [cities])

  useEffect(() => {
    const controller = new AbortController()

    fetchJobs({ city: cities.find((c) => c.name === city)?.id, perPage: 50 }, controller.signal)
      .then((page) => setJobs(page.items))
      .catch(() => {
        if (!controller.signal.aborted) setJobs([])
      })

    return () => controller.abort()
  }, [city, cities])

  /**
   * Distancia de cada vacante a quien mira.
   *
   * Se calcula aquí, en el navegador: la ubicación nunca viaja al servidor.
   */
  const distances = useMemo(() => {
    if (!position) return null

    return new Map(jobs.map((job) => [job.id, distanceKm(position, job.coords)]))
  }, [position, jobs])

  // Con ubicación, la más cercana primero; sin ella, el orden de la API.
  const orderedJobs = useMemo(() => {
    if (!distances) return jobs

    return [...jobs].sort((a, b) => (distances.get(a.id) ?? 0) - (distances.get(b.id) ?? 0))
  }, [jobs, distances])

  // Si el filtro deja fuera la vacante abierta, se cierra el panel.
  useEffect(() => {
    if (selectedId && !jobs.some((job) => job.id === selectedId)) {
      setSelectedId(null)
    }
  }, [jobs, selectedId])

  const selected = jobs.find((j) => j.id === selectedId) ?? null
  const nearest = orderedJobs[0] ?? null
  const defaultCenter = cities[0]?.center ?? [4.8133, -75.6961]
  const permissionMessage = geolocationMessage(status)

  return (
    <div className="relative h-[calc(100dvh-6rem)] w-full overflow-hidden">
      {/* Mapa a pantalla completa */}
      <div className="absolute inset-0">
        <JobsMap
          jobs={orderedJobs}
          center={defaultCenter}
          userPosition={position}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Filtros flotantes sobre el mapa */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto">
          <div className="flex items-start justify-between gap-2 px-5 pb-2">
            <h1 className="inline-flex rounded-full bg-background/85 px-4 py-2 font-display text-lg font-extrabold shadow-md backdrop-blur-md">
              {position ? 'Empleos cerca de ti' : 'Vacantes en el mapa'}
            </h1>

            <div className="flex shrink-0 items-center gap-2">
              <DevContactButton className="size-11 border-0 bg-background/85 shadow-md backdrop-blur-md hover:bg-background" />

              <button
                type="button"
                onClick={position ? clear : request}
                disabled={status === 'locating'}
                aria-label={position ? 'Dejar de usar mi ubicación' : 'Ver empleos cerca de mí'}
                className={`grid size-11 shrink-0 place-items-center rounded-full shadow-md backdrop-blur-md transition-colors disabled:opacity-60 ${
                  position
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/85 text-foreground'
                }`}
              >
                {status === 'locating' ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <LocateFixed className="size-5" />
                )}
              </button>
            </div>
          </div>

          <FilterChips options={cityOptions} value={city} onChange={setCity} label="Ciudad" />

          {permissionMessage ? (
            <div className="px-5 pt-2">
              <p
                role="alert"
                className="rounded-2xl bg-background/90 px-4 py-2.5 text-xs font-medium text-pretty text-muted-foreground shadow-md backdrop-blur-md"
              >
                {permissionMessage}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Panel inferior: la vacante elegida, o la más cercana si hay ubicación */}
      {selected ? (
        <div className="absolute inset-x-0 bottom-0 z-[500] p-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Cerrar"
              className="absolute -top-2 right-1 z-10 grid size-8 place-items-center rounded-full bg-foreground text-background shadow-md"
            >
              <X className="size-4" />
            </button>
            <JobCard
              job={selected}
              saved={isSaved(selected.id)}
              onToggleSave={toggle}
              distanceKm={distances?.get(selected.id)}
            />
          </div>
        </div>
      ) : position && nearest ? (
        <div className="absolute inset-x-0 bottom-0 z-[500] p-4">
          <button
            type="button"
            onClick={() => setSelectedId(nearest.id)}
            className="w-full rounded-2xl bg-background/90 px-4 py-3 text-left shadow-md backdrop-blur-md"
          >
            <span className="block text-[11px] font-bold uppercase tracking-wider text-primary">
              La más cercana · a {formatDistance(distances?.get(nearest.id) ?? 0)}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold">{nearest.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{nearest.company}</span>
          </button>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] p-4">
          <p className="pointer-events-auto mx-auto w-fit rounded-full bg-background/85 px-4 py-2 text-center text-sm font-medium text-pretty text-muted-foreground shadow-md backdrop-blur-md">
            {jobs.length > 0
              ? 'Toca un pin, o el botón de ubicación para ver lo más cercano'
              : 'No hay vacantes en esta zona'}
          </p>
        </div>
      )}
    </div>
  )
}
