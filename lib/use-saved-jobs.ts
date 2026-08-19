'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'reconstruir-empleo:guardados'
const MAX_SAVED = 200

/**
 * Vacantes guardadas, en el navegador de cada persona.
 *
 * No hay cuentas de usuario, así que esto vive en localStorage: nadie tiene
 * que dar un correo ni crear una contraseña para marcar una oferta.
 */
export function useSavedJobs() {
  const [saved, setSaved] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const parsed: unknown = raw ? JSON.parse(raw) : []

      if (Array.isArray(parsed)) {
        setSaved(parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_SAVED))
      }
    } catch {
      // localStorage lleno, deshabilitado o con datos corruptos: se empieza
      // de cero en lugar de romper la pantalla.
    } finally {
      setLoaded(true)
    }
  }, [])

  const persist = useCallback((ids: string[]) => {
    setSaved(ids)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch {
      // Si no se puede escribir, al menos la sesión actual funciona.
    }
  }, [])

  const toggle = useCallback(
    (id: string) => {
      persist(
        saved.includes(id) ? saved.filter((x) => x !== id) : [id, ...saved].slice(0, MAX_SAVED),
      )
    },
    [saved, persist],
  )

  const remove = useCallback((id: string) => persist(saved.filter((x) => x !== id)), [saved, persist])

  const isSaved = useCallback((id: string) => saved.includes(id), [saved])

  return { saved, loaded, toggle, remove, isSaved }
}
