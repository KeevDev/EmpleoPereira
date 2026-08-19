// Geometría de apoyo para el selector de ubicación.
//
// Estos valores replican los del backend (config/empleo.php). Se validan aquí
// solo para avisar antes de enviar; la comprobación que manda es la del
// servidor, porque el cliente siempre se puede saltar.

/** Caja que envuelve el área metropolitana de Pereira. */
export const REGION_BOUNDS = {
  minLat: 4.6,
  maxLat: 5.1,
  minLng: -76.05,
  maxLng: -75.35,
} as const

/** Distancia máxima entre la vacante y el centro del municipio elegido. */
export const MAX_DISTANCE_FROM_CITY_KM = 25

export function isWithinRegion([lat, lng]: [number, number]): boolean {
  return (
    lat >= REGION_BOUNDS.minLat &&
    lat <= REGION_BOUNDS.maxLat &&
    lng >= REGION_BOUNDS.minLng &&
    lng <= REGION_BOUNDS.maxLng
  )
}

/** Distancia en kilómetros entre dos puntos (haversine). */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const earthRadiusKm = 6371

  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

/** Distancia legible: "350 m", "1,2 km", "18 km". */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000 / 50) * 50} m`
  }

  if (km < 10) {
    return `${km.toFixed(1).replace('.', ',')} km`
  }

  return `${Math.round(km)} km`
}

/**
 * Devuelve el motivo por el que un punto no sirve, o null si es válido.
 */
export function rejectLocation(
  point: [number, number],
  cityCenter: [number, number],
  cityName: string,
): string | null {
  if (!isWithinRegion(point)) {
    return 'Ese punto está fuera del área de cobertura.'
  }

  const km = distanceKm(point, cityCenter)

  if (km > MAX_DISTANCE_FROM_CITY_KM) {
    return `Ese punto está a ${Math.round(km)} km de ${cityName}. Acerca el marcador o cambia de ciudad.`
  }

  return null
}
