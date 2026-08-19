// Constantes de la interfaz y ayudas de presentación.
//
// Las vacantes, ciudades y categorías reales vienen de la API (lib/api.ts).
// Lo que queda aquí son los valores de respaldo para que la aplicación siga
// siendo usable si la API tarda o está caída, más los helpers de contacto.

import type { City, Job } from '@/lib/types'

export type { Category, City, CityId, Job, JobTypeLabel, JobTypeSlug } from '@/lib/types'

/**
 * Municipios de respaldo. La API es la fuente de verdad; esto solo evita que
 * el mapa se quede sin centro mientras carga.
 */
export const FALLBACK_CITIES: City[] = [
  { id: 'pereira', name: 'Pereira', center: [4.8133, -75.6961] },
  { id: 'dosquebradas', name: 'Dosquebradas', center: [4.8339, -75.6733] },
  { id: 'santa-rosa', name: 'Santa Rosa de Cabal', center: [4.8686, -75.6217] },
]

export const ALL_OPTION = 'Todas'

/** Tipos de contrato, con la etiqueta que ve la persona y el valor que espera la API. */
export const JOB_TYPES = [
  { slug: 'full_time', label: 'Tiempo completo' },
  { slug: 'part_time', label: 'Medio tiempo' },
  { slug: 'by_days', label: 'Por días' },
  { slug: 'temporary', label: 'Temporal' },
  { slug: 'volunteer', label: 'Voluntariado' },
] as const

/**
 * Construye el enlace de WhatsApp con un mensaje prellenado.
 * Devuelve null si la vacante no dejó número.
 */
export function whatsappHref(job: Job): string | null {
  if (!job.whatsapp) return null

  const phone = job.whatsapp.replace(/\D/g, '')
  if (!phone) return null

  const text = `Hola${job.contactName ? ' ' + job.contactName : ''}, vi la vacante "${job.title}" en Reconstruir Empleo y me interesa. ¿Sigue disponible?`

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}

/**
 * Construye el enlace mailto con asunto y cuerpo prellenados.
 * Devuelve null si la vacante no dejó correo.
 */
export function mailtoHref(job: Job): string | null {
  if (!job.email) return null

  const subject = `Interesado/a en la vacante: ${job.title}`
  const body = `Hola${job.contactName ? ' ' + job.contactName : ''},\n\nVi la vacante "${job.title}" (${job.company}) en Reconstruir Empleo y me gustaría postularme.\n\nGracias.`

  return `mailto:${encodeURIComponent(job.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
