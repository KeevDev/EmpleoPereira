'use client'

import { useCallback, useState } from 'react'

export type GeolocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable' | 'error'

/**
 * Ubicación de quien usa la aplicación.
 *
 * Se pide **solo cuando la persona pulsa el botón**, nunca al cargar la
 * pantalla: un permiso que salta solo es intrusivo y la mayoría lo deniega por
 * reflejo. Y la posición no sale del navegador: la cercanía se calcula aquí
 * mismo, así que ni el servidor ni los logs saben nunca dónde está nadie.
 */
export function useGeolocation() {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [status, setStatus] = useState<GeolocationStatus>('idle')

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable')
      return
    }

    setStatus('locating')

    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition([result.coords.latitude, result.coords.longitude])
        setStatus('ready')
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error')
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        // Vale una posición de hasta cinco minutos: para ordenar vacantes por
        // cercanía no hace falta despertar el GPS cada vez.
        maximumAge: 300_000,
      },
    )
  }, [])

  const clear = useCallback(() => {
    setPosition(null)
    setStatus('idle')
  }, [])

  return { position, status, request, clear }
}

/** Mensaje para cada forma en que puede fallar el permiso. */
export function geolocationMessage(status: GeolocationStatus): string | null {
  switch (status) {
    case 'denied':
      return 'No nos diste permiso de ubicación. Puedes activarlo desde los ajustes del navegador.'
    case 'unavailable':
      return 'Tu navegador no permite compartir la ubicación.'
    case 'error':
      return 'No pudimos obtener tu ubicación. Inténtalo de nuevo.'
    default:
      return null
  }
}
