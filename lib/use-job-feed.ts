'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchJobs } from '@/lib/api'
import type { Job, JobFilters } from '@/lib/types'

/**
 * Feed paginado con carga al llegar al final.
 *
 * Lo que evita que el scroll infinito se convierta en una tormenta de
 * peticiones:
 *
 * - **Una sola petición en vuelo.** El observador dispara muchas veces
 *   mientras se baja; `cargando` la corta hasta que la anterior termine.
 * - **Páginas pequeñas** (20 por defecto, el tamaño natural del backend) y un
 *   margen de 400 px, que pide la siguiente justo antes de que haga falta.
 *   Con el límite de lectura en 60/min por IP, hay que bajar muy en serio
 *   para acercarse.
 * - **Los filtros esperan.** Al escribir en el buscador no se pide nada hasta
 *   que se para de teclear; cada tecla habría sido una petición.
 * - **Sin repetidos.** La paginación por desplazamiento puede devolver dos
 *   veces la misma vacante si alguien publica mientras tú bajas, así que al
 *   añadir una página se descartan los identificadores que ya estaban.
 */
const PER_PAGE = 20
const DEBOUNCE_MS = 300
/** Cuánto antes del final se pide la página siguiente. */
const ROOT_MARGIN = '400px 0px'

export type FeedState = 'loading' | 'ready' | 'error'

export function useJobFeed(filters: JobFilters) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [state, setState] = useState<FeedState>('loading')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // El objeto de filtros se construye en cada render, así que no sirve como
  // dependencia: lo que identifica una búsqueda es su contenido.
  const key = JSON.stringify(filters)

  const page = useRef(1)
  const busy = useRef(false)
  const controller = useRef<AbortController | null>(null)

  // Primera página: se rehace entera cada vez que cambian los filtros.
  useEffect(() => {
    const request = new AbortController()
    controller.current?.abort()
    controller.current = request

    const timer = setTimeout(() => {
      setState('loading')
      busy.current = true

      fetchJobs({ ...filters, page: 1, perPage: PER_PAGE }, request.signal)
        .then((result) => {
          setJobs(result.items)
          setTotal(result.total)
          setHasMore(result.hasMore)
          setState('ready')
          page.current = 1
        })
        .catch(() => {
          if (!request.signal.aborted) setState('error')
        })
        .finally(() => {
          busy.current = false
        })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      request.abort()
    }
    // `filters` entra por `key`: comparar el objeto dispararía en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const loadMore = useCallback(() => {
    if (busy.current || !hasMore || state !== 'ready') return

    busy.current = true
    setLoadingMore(true)

    const next = page.current + 1
    const request = controller.current

    fetchJobs({ ...filters, page: next, perPage: PER_PAGE }, request?.signal)
      .then((result) => {
        setJobs((previous) => {
          const seen = new Set(previous.map((job) => job.id))
          return [...previous, ...result.items.filter((job) => !seen.has(job.id))]
        })
        setHasMore(result.hasMore)
        page.current = next
      })
      .catch(() => {
        // Un fallo al bajar no vacía lo que ya se está leyendo: se deja de
        // pedir más y quien siga bajando lo reintenta.
        if (!request?.signal.aborted) setHasMore(false)
      })
      .finally(() => {
        busy.current = false
        setLoadingMore(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hasMore, state])

  // El observador se queda con la última versión de loadMore sin tener que
  // volver a montarse cada vez que cambia.
  const latest = useRef(loadMore)
  useEffect(() => {
    latest.current = loadMore
  }, [loadMore])

  const observer = useRef<IntersectionObserver | null>(null)

  const sentinelRef = useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect()

    if (node === null) return

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) latest.current()
      },
      { rootMargin: ROOT_MARGIN },
    )

    observer.current.observe(node)
  }, [])

  useEffect(() => () => observer.current?.disconnect(), [])

  return { jobs, total, state, hasMore, loadingMore, sentinelRef }
}
