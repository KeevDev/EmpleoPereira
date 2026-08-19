// La API devuelve fechas ISO; la tarjeta muestra "Hace 2 h".

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Antigüedad en lenguaje natural. Devuelve null si no hay fecha, para que
 * quien la use decida qué pintar en su lugar.
 */
export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))

  if (seconds < MINUTE) return 'Ahora'
  if (seconds < HOUR) return `Hace ${Math.floor(seconds / MINUTE)} min`
  if (seconds < DAY) return `Hace ${Math.floor(seconds / HOUR)} h`

  const days = Math.floor(seconds / DAY)
  if (days < 7) return `Hace ${days} d`
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem`

  return `Hace ${Math.floor(days / 30)} mes${days >= 60 ? 'es' : ''}`
}
