// Cliente de la API de vacantes.
//
// El front vive en Vercel y la API en un servidor propio, así que todas las
// llamadas son cross-origin. La URL se inyecta por entorno
// (NEXT_PUBLIC_API_URL) y nunca se escribe a mano en los componentes.

import type {
  BoardStats,
  Category,
  City,
  FormToken,
  Job,
  JobFilters,
  NewJobInput,
  Paginated,
  PublishResult,
  PushKey,
  PushSubscriptionInput,
  ReportReason,
} from '@/lib/types'

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '')

/**
 * El service worker necesita esta misma URL para volver a registrarse por su
 * cuenta cuando el navegador rota un endpoint, y allí no llega `process.env`.
 */
export function apiBaseUrl(): string {
  return BASE_URL
}

/** Corta la espera para que un backend caído no deje la pantalla colgada. */
const TIMEOUT_MS = 10_000

export class ApiError extends Error {
  readonly status: number
  /** Errores por campo, tal como los devuelve la validación de Laravel. */
  readonly errors: Record<string, string[]>

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  /** Primer mensaje de error de un campo concreto. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0]
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST'
  body?: unknown
  signal?: AbortSignal
  /**
   * Segundos de caché. Solo tiene efecto si la llamada sale desde el
   * servidor; en el navegador Next lo ignora. Se deja indicado para que, si
   * alguna pantalla pasa a renderizarse en servidor, ya tenga su política.
   */
  revalidate?: number
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError(
      'La aplicación no tiene configurada la URL de la API (NEXT_PUBLIC_API_URL).',
      0,
    )
  }

  const { method = 'GET', body, revalidate } = options

  // Un timeout propio, combinado con el AbortSignal que llegue de fuera.
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout

  let response: Response

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      // Sin cookies ni credenciales: la API es stateless y pública.
      credentials: 'omit',
      mode: 'cors',
      referrerPolicy: 'no-referrer',
      ...(revalidate !== undefined ? { next: { revalidate } } : {}),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError('El servidor tardó demasiado en responder.', 408)
    }
    throw new ApiError('No pudimos conectar con el servidor. Revisa tu conexión.', 0)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      (payload && typeof payload.message === 'string' && payload.message) ||
      'Ocurrió un error inesperado.'

    throw new ApiError(message, response.status, payload?.errors ?? {})
  }

  return payload as T
}

function buildQuery(filters: JobFilters): string {
  const params = new URLSearchParams()

  if (filters.query) params.set('query', filters.query)
  if (filters.city) params.set('city', filters.city)
  if (filters.category) params.set('category', filters.category)
  if (filters.type) params.set('type', filters.type)
  if (filters.urgent !== undefined) params.set('urgent', filters.urgent ? '1' : '0')
  if (filters.page) params.set('page', String(filters.page))
  if (filters.perPage) params.set('perPage', String(filters.perPage))

  const query = params.toString()
  return query ? `?${query}` : ''
}

type ApiCollection<T> = {
  data: T[]
  /**
   * `meta` cambia de forma según la página: la primera trae `total` y
   * `last_page` (paginador completo) y las siguientes no, porque el backend
   * se ahorra el recuento. `links.next` es lo único que aparece en ambas, y
   * por eso es lo que decide si queda más.
   */
  meta?: { current_page?: number; last_page?: number; total?: number }
  links?: { next?: string | null }
}

export async function fetchJobs(
  filters: JobFilters = {},
  signal?: AbortSignal,
): Promise<Paginated<Job>> {
  const payload = await request<ApiCollection<Job>>(`/api/v1/jobs${buildQuery(filters)}`, {
    signal,
    revalidate: 30,
  })

  return {
    items: payload.data,
    total: payload.meta?.total ?? 0,
    page: payload.meta?.current_page ?? 1,
    hasMore: Boolean(payload.links?.next),
  }
}

export async function fetchJob(id: string, signal?: AbortSignal): Promise<Job> {
  const payload = await request<{ data: Job }>(`/api/v1/jobs/${encodeURIComponent(id)}`, {
    signal,
    revalidate: 30,
  })

  return payload.data
}

export async function fetchCities(signal?: AbortSignal): Promise<City[]> {
  // Catálogo casi inmutable: una hora de caché en el CDN.
  const payload = await request<ApiCollection<City>>('/api/v1/cities', {
    signal,
    revalidate: 3600,
  })

  return payload.data
}

export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  const payload = await request<ApiCollection<Category>>('/api/v1/categories', {
    signal,
    revalidate: 3600,
  })

  return payload.data
}

/**
 * Cifras del tablón. Las calcula el backend sobre lo que hoy está visible;
 * el front nunca las deduce de la página que tenga cargada, que solo trae 50.
 */
export async function fetchStats(signal?: AbortSignal): Promise<BoardStats> {
  const payload = await request<{ data: BoardStats }>('/api/v1/stats', {
    signal,
    revalidate: 300,
  })

  return payload.data
}

/**
 * Token que hay que devolver al publicar. El backend lo usa para descartar
 * bots: es de un solo uso y lleva firmada su hora de emisión.
 */
export async function fetchFormToken(signal?: AbortSignal): Promise<FormToken> {
  const payload = await request<{
    data: { token: string; expires_at: string; min_seconds: number }
  }>('/api/v1/form-token', { signal, revalidate: 0 })

  return {
    token: payload.data.token,
    expiresAt: payload.data.expires_at,
    minSeconds: payload.data.min_seconds,
  }
}

export async function publishJob(input: NewJobInput): Promise<PublishResult> {
  const payload = await request<{ data: Omit<PublishResult, 'message'>; message: string }>(
    '/api/v1/jobs',
    { method: 'POST', body: input },
  )

  return { ...payload.data, message: payload.message }
}

/**
 * Clave pública VAPID del servidor.
 *
 * Se pide en vez de llevarla compilada en el bundle: así rotar el par de
 * claves no obliga a redesplegar en Vercel, y hay una sola fuente de verdad.
 */
export async function fetchPushKey(signal?: AbortSignal): Promise<PushKey> {
  const payload = await request<{ data: PushKey }>('/api/v1/push/key', {
    signal,
    revalidate: 300,
  })

  return payload.data
}

/**
 * Alta, o actualización de las categorías de una suscripción que ya existe.
 *
 * Se reenvía en cada arranque de la aplicación: un endpoint puede cambiar
 * sin que la persona toque nada, y esta llamada es también la señal de vida
 * que evita que el servidor borre la suscripción por inactividad.
 */
export async function subscribeToPush(input: PushSubscriptionInput): Promise<void> {
  await request('/api/v1/push/subscriptions', { method: 'POST', body: input })
}

export async function unsubscribeFromPush(endpoint: string): Promise<void> {
  await request('/api/v1/push/unsubscribe', { method: 'POST', body: { endpoint } })
}

export async function reportJob(
  id: string,
  reason: ReportReason,
  comment?: string,
): Promise<string> {
  const payload = await request<{ message: string }>(
    `/api/v1/jobs/${encodeURIComponent(id)}/report`,
    { method: 'POST', body: { reason, comment } },
  )

  return payload.message
}
