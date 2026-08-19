'use client'

import { useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import type { Job } from '@/lib/types'

// Icono de pin personalizado (color según urgencia).
//
// El HTML se construye aquí con valores fijos del propio componente. Los
// colores nunca salen de la vacante: si vinieran del texto que escribe quien
// publica, este `html` sería una vía directa de inyección.
function pinIcon(color: string, urgent?: boolean) {
  return L.divIcon({
    className: 'job-pin',
    html: `
      <div style="position:relative;">
        <div style="
          width:34px;height:34px;border-radius:50% 50% 50% 0;
          background:${color};transform:rotate(-45deg);
          box-shadow:0 4px 10px rgba(0,0,0,.3);
          border:2px solid #fff;display:grid;place-items:center;">
          <div style="transform:rotate(45deg);color:#fff;font-weight:800;font-size:14px;">
            ${urgent ? '!' : '$'}
          </div>
        </div>
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  })
}

// Punto azul de "estás aquí", con el mismo lenguaje visual de los mapas
// habituales para que se lea sin explicación.
const userIcon = L.divIcon({
  className: 'user-position',
  html: `
    <div style="
      width:18px;height:18px;border-radius:9999px;
      background:#1a73e8;border:3px solid #fff;
      box-shadow:0 0 0 6px rgba(26,115,232,.25), 0 2px 6px rgba(0,0,0,.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

/**
 * Ajusta la vista para englobar las vacantes y, si la hay, la posición de
 * quien mira: no sirve de nada ver los empleos cercanos si el punto propio
 * queda fuera de pantalla.
 */
function FitBounds({ jobs, userPosition }: { jobs: Job[]; userPosition: [number, number] | null }) {
  const map = useMap()

  useMemo(() => {
    const points = jobs.map((j) => j.coords)
    if (userPosition) points.push(userPosition)
    if (points.length === 0) return

    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 })
  }, [jobs, userPosition, map])

  return null
}

export default function JobsMap({
  jobs,
  center,
  selectedId,
  onSelect,
  userPosition = null,
}: {
  jobs: Job[]
  center: [number, number]
  selectedId?: string | null
  onSelect?: (id: string) => void
  /** Posición de quien mira, si compartió su ubicación. */
  userPosition?: [number, number] | null
}) {
  const primary = 'oklch(0.575 0.208 27)'
  const accent = 'oklch(0.7 0.16 70)'

  return (
    <MapContainer
      center={center}
      zoom={12}
      zoomControl={false}
      scrollWheelZoom
      className="size-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FitBounds jobs={jobs} userPosition={userPosition} />

      {userPosition ? (
        <Marker
          position={userPosition}
          icon={userIcon}
          // Que nunca tape un pin de vacante: es referencia, no destino.
          zIndexOffset={-1000}
          interactive={false}
        />
      ) : null}

      {jobs.map((job) => (
        <Marker
          key={job.id}
          position={job.coords}
          icon={pinIcon(job.urgent ? primary : accent, job.urgent)}
          eventHandlers={{ click: () => onSelect?.(job.id) }}
          zIndexOffset={selectedId === job.id ? 1000 : 0}
        />
      ))}
    </MapContainer>
  )
}
