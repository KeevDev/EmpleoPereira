import { NextResponse, type NextRequest } from 'next/server'

/**
 * Content-Security-Policy con nonce por petición.
 *
 * Es la diferencia entre una CSP decorativa y una que sirve: sin nonce habría
 * que permitir 'unsafe-inline' para los scripts de arranque de Next, y eso
 * anula casi todo el valor de la política. Con nonce + 'strict-dynamic' solo
 * se ejecuta el JavaScript que la propia página firma.
 *
 * Next.js detecta el nonce leyendo la cabecera CSP de la petición y lo aplica
 * a sus propios scripts automáticamente.
 */

/** Origen de la API, para poder abrirle un hueco en connect-src. */
function apiOrigin(): string {
  const url = process.env.NEXT_PUBLIC_API_URL

  if (!url) return ''

  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}

/**
 * En desarrollo React usa eval() para reconstruir las pilas de llamadas y
 * demás herramientas de depuración, y sin este hueco la consola se llena de
 * errores de CSP. `next dev` y `next build` fijan NODE_ENV ellos mismos, así
 * que el permiso no puede colarse en producción por descuido.
 */
const isDevelopment = process.env.NODE_ENV === 'development'

function buildCsp(nonce: string): string {
  const api = apiOrigin()

  return [
    "default-src 'self'",

    // 'strict-dynamic' hace que los scripts cargados por uno con nonce
    // hereden la confianza; los navegadores antiguos que no lo entienden
    // caen en 'self'.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:${
      isDevelopment ? " 'unsafe-eval'" : ''
    }`,

    // Next y Tailwind inyectan estilos en línea; no hay forma de evitarlo
    // sin romper el renderizado. El riesgo de un style-src abierto es muy
    // inferior al de un script-src abierto.
    "style-src 'self' 'unsafe-inline'",

    // Teselas del mapa (Leaflet + Carto) e imágenes propias.
    "img-src 'self' data: blob: https://*.basemaps.cartocdn.com",

    "font-src 'self' data:",

    // Solo se habla con la propia app (analytics de Vercel) y con la API.
    `connect-src 'self'${api ? ` ${api}` : ''}`,

    "manifest-src 'self'",
    "worker-src 'self' blob:",

    // Nada de plugins, iframes ni incrustar esta página en otra.
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",

    // Un XSS no puede reescribir la base de las URLs relativas ni redirigir
    // el envío de los formularios a otro servidor.
    "base-uri 'self'",
    "form-action 'self'",

    'upgrade-insecure-requests',
  ].join('; ')
}

export default function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll('-', '')
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    /*
     * Todas las rutas salvo los estáticos, que no ejecutan scripts y no
     * necesitan pagar el coste de pasar por el middleware:
     * - _next/static, _next/image
     * - favicon, iconos, manifest
     * - sw.js, que trae su propia CSP desde next.config.mjs: es mucho más
     *   estrecha que la de las páginas y no necesita nonce, porque el
     *   service worker no renderiza nada
     * - los prefetch de Next
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon.*|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
