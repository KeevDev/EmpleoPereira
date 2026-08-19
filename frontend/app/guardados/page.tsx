'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { JobCard } from '@/components/job-card'
import { JobListSkeleton } from '@/components/job-list-skeleton'
import { EmptyState } from '@/components/empty-state'
import { DevContact } from '@/components/dev-contact'
import { ApiError, fetchJob } from '@/lib/api'
import { useSavedJobs } from '@/lib/use-saved-jobs'
import type { Job } from '@/lib/types'

export default function GuardadosPage() {
  const { saved, loaded, remove } = useSavedJobs()

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loaded) return

    if (saved.length === 0) {
      setJobs([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)

    Promise.allSettled(saved.map((id) => fetchJob(id, controller.signal))).then((results) => {
      if (controller.signal.aborted) return

      const found: Job[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          found.push(result.value)
          return
        }

        // Una vacante que ya no existe (caducó o la retiraron) se quita sola
        // de la lista, en lugar de quedarse como un hueco permanente.
        if (result.reason instanceof ApiError && result.reason.status === 404) {
          remove(saved[index])
        }
      })

      setJobs(found)
      setLoading(false)
    })

    return () => controller.abort()
    // `remove` cambia en cada render y volvería a disparar el efecto: la
    // lista de ids guardados es la única dependencia que importa aquí.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, loaded])

  const showSkeleton = !loaded || (loading && saved.length > 0)

  return (
    <div className="flex flex-col gap-4">
      <AppHeader
        title="Vacantes guardadas"
        subtitle={`${jobs.length} guardada${jobs.length === 1 ? '' : 's'}`}
        action={<span />}
      />

      <div className="flex flex-col gap-3 px-5">
        {showSkeleton ? <JobListSkeleton count={2} /> : null}

        {!showSkeleton && jobs.length === 0 ? (
          <EmptyState
            title="Aún no tienes guardados"
            description="Guarda las vacantes que te interesen para verlas aquí."
            action={
              <Link
                href="/"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
              >
                Explorar vacantes
              </Link>
            }
          />
        ) : null}

        {!showSkeleton
          ? jobs.map((job) => <JobCard key={job.id} job={job} saved onToggleSave={remove} />)
          : null}
      </div>

      <DevContact />
    </div>
  )
}
