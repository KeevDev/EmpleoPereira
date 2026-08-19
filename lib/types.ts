// Contrato de datos con la API. Refleja lo que devuelve
// App\Http\Resources\* del backend Laravel.

export type CityId = string

export type City = {
  id: CityId
  name: string
  /** [lat, lng] — el orden que espera Leaflet. */
  center: [number, number]
}

export type Category = {
  slug: string
  name: string
  /** true solo para "Otro", la opción que abre el campo de categoría nueva. */
  isSystem: boolean
}

/** Slug de la categoría comodín. Debe coincidir con Category::OTHER_SLUG. */
export const OTHER_CATEGORY_SLUG = 'otro'

/** Etiqueta en español del tipo de contrato, tal como la pinta la tarjeta. */
export type JobTypeLabel =
  | 'Tiempo completo'
  | 'Medio tiempo'
  | 'Por días'
  | 'Temporal'
  | 'Voluntariado'

export type JobTypeSlug = 'full_time' | 'part_time' | 'by_days' | 'temporary' | 'volunteer'

export type Job = {
  id: string
  title: string
  company: string
  /** Persona que publicó el aviso. Se muestra como "Publicado por". */
  publisherName: string | null

  cityId: CityId
  cityName?: string
  neighborhood: string | null
  /** [lat, lng] */
  coords: [number, number]

  type: JobTypeLabel
  typeSlug: JobTypeSlug

  category?: string
  categorySlug?: string

  salary: string | null
  description: string
  urgent: boolean

  /** Color del avatar. Lo asigna el servidor; el cliente nunca lo elige. */
  logoColor: string

  /** ISO 8601. El front lo convierte a "Hace 2 h". */
  postedAt: string | null
  expiresAt: string | null

  contactName: string | null
  whatsapp: string | null
  email: string | null
}

/** Cifras del tablón que pinta el banner de la portada. */
export type BoardStats = {
  vacancies: number
  companies: number
  cities: number
}

export type JobFilters = {
  query?: string
  city?: string
  category?: string
  type?: JobTypeSlug
  urgent?: boolean
  page?: number
  perPage?: number
}

export type Paginated<T> = {
  items: T[]
  /**
   * Resultados que hay con estos filtros. El backend solo lo cuenta en la
   * primera página; a partir de ahí llega 0 y quien acumula páginas se queda
   * con el que ya tenía.
   */
  total: number
  page: number
  /** Si queda al menos una página más por pedir. */
  hasMore: boolean
}

export type FormToken = {
  token: string
  expiresAt: string
  minSeconds: number
}

/** Lo que envía el formulario de publicación. */
export type NewJobInput = {
  formToken: string
  title: string
  company: string
  /** Nombre de quien publica; se usa para agradecerle y se muestra en la tarjeta. */
  publisherName: string
  cityId: string
  /** Slug de una categoría existente, o "otro" para crear una nueva. */
  category: string
  /** Nombre de la categoría nueva. Obligatorio cuando category es "otro". */
  categoryName?: string
  type: JobTypeSlug
  neighborhood?: string
  salary?: string
  description: string
  urgent: boolean
  /** Punto exacto marcado en el mapa. Si falta, el servidor usa el centro de la ciudad. */
  latitude?: number
  longitude?: number
  contactName?: string
  whatsapp?: string
  email?: string
  /** Campo trampa: siempre vacío. Si viene relleno, fue un bot. */
  website?: string
}

export type PublishResult = {
  id: string
  status: 'pending' | 'published'
  statusLabel: string
  publisherName: string | null
  /** Solo el estado, sin el saludo: para mostrarlo bajo un titular propio. */
  statusMessage: string
  /** Agradecimiento completo ya compuesto por el servidor, con el nombre saneado. */
  message: string
}

export type ReportReason = 'spam' | 'scam' | 'offensive' | 'expired' | 'wrong_info' | 'other'

/**
 * Estado de los avisos push en el servidor.
 *
 * `enabled: false` significa que la API no tiene claves VAPID configuradas:
 * el front esconde la opción entera en vez de ofrecer algo que no funciona.
 */
export type PushKey = {
  enabled: boolean
  publicKey: string | null
}

/** Lo que el navegador entrega en `PushSubscription.toJSON()`. */
export type PushSubscriptionInput = {
  endpoint: string
  keys: { p256dh: string; auth: string }
  contentEncoding?: string
  /** Slugs de categoría. Lista vacía = todas. */
  categories: string[]
}
