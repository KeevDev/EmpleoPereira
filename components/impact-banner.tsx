'use client'

import { useEffect, useState } from 'react'
import { HeartHandshake } from 'lucide-react'
import { fetchStats } from '@/lib/api'
import type { BoardStats } from '@/lib/types'

export function ImpactBanner() {
  const [stats, setStats] = useState<BoardStats | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchStats(controller.signal)
      .then(setStats)
      .catch(() => {
        // Sin cifras el banner sigue teniendo mensaje: se queda con los
        // guiones antes que inventar un número o desaparecer de golpe.
      })

    return () => controller.abort()
  }, [])

  return (
    <div className="mx-5 overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg shadow-primary/25">
      <div className="flex items-center gap-2">
        <HeartHandshake className="size-5" />
        <span className="text-xs font-bold uppercase tracking-wider opacity-90">
          Reconstruyendo el Eje
        </span>
      </div>
      <p className="mt-2 font-display text-lg font-bold leading-snug text-balance">
        Cada empleo ayuda a una familia a levantarse de nuevo.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat value={stats?.vacancies} label="Vacantes" />
        <Stat value={stats?.companies} label="Empresas" />
        <Stat value={stats?.cities} label="Ciudades" />
      </div>
    </div>
  )
}

function Stat({ value, label }: { value?: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm">
      <div className="font-display text-xl font-extrabold leading-none tabular-nums">
        {value === undefined ? '—' : value.toLocaleString('es-CO')}
      </div>
      <div className="mt-1 text-[11px] font-medium opacity-90">{label}</div>
    </div>
  )
}
