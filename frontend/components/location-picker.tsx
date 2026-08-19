'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

/**
 * Mapa para marcar dónde queda el trabajo.
 *
 * Es opcional: si nadie toca el mapa, la vacante se ancla al centro del
 * municipio. Marcar el punto exacto es lo que hace útil la pantalla del mapa
 * para quien busca empleo cerca de su casa.
 */

// El mismo pin que usa el mapa de vacantes, en versión "sin confirmar".
// Se construye con valores fijos del componente, nunca con texto del usuario.
const pinIcon = L.divIcon({
  className: 'job-pin',
  html: `
    <div style="
      width:34px;height:34px;border-radius:50% 50% 50% 0;
      background:oklch(0.575 0.208 27);transform:rotate(-45deg);
      box-shadow:0 4px 10px rgba(0,0,0,.3);
      border:2px solid #fff;display:grid;place-items:center;">
      <div style="transform:rotate(45deg);color:#fff;font-weight:800;font-size:14px;">✓</div>
    </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
})

/** Coloca el marcador donde se toque el mapa. */
function ClickHandler({ onPick }: { onPick: (coords: [number, number]) => void }) {
  useMapEvents({
    click(event) {
      onPick([event.latlng.lat, event.latlng.lng])
    },
  })

  return null
}

/**
 * Recentra el mapa al cambiar de municipio.
 *
 * Sin esto, quien elige "Santa Rosa" después de haber estado mirando Pereira
 * se queda con el mapa en el sitio equivocado. Solo mira el centro de la
 * ciudad: si dependiera también del marcador, el mapa saltaría cada vez que
 * se arrastra el pin.
 */
function RecenterOnCity({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const mounted = useRef(false)
  const [lat, lng] = center

  useEffect(() => {
    // En el primer render el centro ya lo puso MapContainer.
    if (!mounted.current) {
      mounted.current = true
      return
    }

    map.setView([lat, lng], zoom)
  }, [lat, lng, zoom, map])

  return null
}

/** Leaflet calcula mal su tamaño si nace dentro de un contenedor que aún no
 *  tiene altura definitiva; esto le obliga a recalcular al montarse. */
function InvalidateOnMount() {
  const map = useMap()

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 120)
    return () => clearTimeout(timer)
  }, [map])

  return null
}

export default function LocationPicker({
  center,
  value,
  onChange,
}: {
  /** Centro del municipio elegido. */
  center: [number, number]
  /** Punto marcado, o null si todavía no se marcó ninguno. */
  value: [number, number] | null
  onChange: (coords: [number, number]) => void
}) {
  return (
    <MapContainer
      center={value ?? center}
      zoom={13}
      // La rueda del ratón secuestraría el desplazamiento del formulario.
      scrollWheelZoom={false}
      zoomControl
      className="size-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      <InvalidateOnMount />
      <RecenterOnCity center={center} zoom={13} />
      <ClickHandler onPick={onChange} />

      {value ? (
        <Marker
          position={value}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend(event) {
              const { lat, lng } = event.target.getLatLng()
              onChange([lat, lng])
            },
          }}
        />
      ) : null}
    </MapContainer>
  )
}
