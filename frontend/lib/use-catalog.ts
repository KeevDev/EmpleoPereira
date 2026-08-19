'use client'

import { useEffect, useState } from 'react'
import { fetchCategories, fetchCities } from '@/lib/api'
import { FALLBACK_CITIES } from '@/lib/data'
import type { Category, City } from '@/lib/types'

/**
 * Ciudades y categorías disponibles.
 *
 * Si la API no responde se usan las ciudades de respaldo, para que el mapa y
 * los filtros sigan teniendo algo con lo que trabajar.
 */
export function useCatalog() {
  const [cities, setCities] = useState<City[]>(FALLBACK_CITIES)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const controller = new AbortController()

    Promise.allSettled([fetchCities(controller.signal), fetchCategories(controller.signal)]).then(
      ([citiesResult, categoriesResult]) => {
        if (controller.signal.aborted) return

        if (citiesResult.status === 'fulfilled' && citiesResult.value.length > 0) {
          setCities(citiesResult.value)
        }
        if (categoriesResult.status === 'fulfilled') {
          setCategories(categoriesResult.value)
        }
      },
    )

    return () => controller.abort()
  }, [])

  return { cities, categories }
}
