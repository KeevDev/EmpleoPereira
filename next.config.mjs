/**
 * Origen de la API, para abrirle un hueco en la CSP del service worker.
 *
 * El mismo cálculo que hace proxy.ts para las páginas: al rotar las claves
 * VAPID o al cambiar de endpoint, el worker vuelve a registrar la
 * suscripción por su cuenta, y para eso necesita poder llamar a la API.
 */
function apiOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? '').origin
  } catch {
    return ''
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // No anunciar que esto corre sobre Next.
  poweredByHeader: false,

  // Los errores de tipos deben romper el despliegue, no colarse a producción.
  // (Antes estaba en `ignoreBuildErrors: true`, que es cómodo para prototipar
  // y peligroso para publicar.)
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    // No se cargan imágenes remotas: todo lo visual es local o CSS.
    unoptimized: true,
  },

  /**
   * Cabeceras de seguridad estáticas.
   *
   * La Content-Security-Policy no está aquí: se genera por petición en
   * middleware.ts, porque lleva un nonce distinto cada vez.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Fuerza HTTPS durante dos años, incluidos subdominios.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // El navegador respeta el Content-Type declarado y no adivina.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Refuerzo de frame-ancestors para navegadores antiguos.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Al salir hacia WhatsApp o un correo no se filtra la ruta interna.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Se renuncia a APIs del navegador que esta aplicación no usa.
          //
          // `geolocation=(self)` está permitido solo para esta página: lo
          // necesita el botón "empleos cerca de mí" del mapa. Los iframes de
          // terceros siguen sin poder pedirla, porque no se incluye `*`.
          {
            key: 'Permissions-Policy',
            value:
              'accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=()',
          },
          // Aísla la pestaña de otras ventanas y procesos.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
      {
        // El service worker de los avisos push.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          // Nunca cacheado: un worker viejo servido desde el CDN seguiría
          // funcionando durante horas después de un despliegue.
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          // Su ámbito es la raíz del sitio, no /public.
          { key: 'Service-Worker-Allowed', value: '/' },
          // Política propia y mucho más estrecha que la de las páginas: este
          // fichero no carga nada, solo habla con la API.
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; script-src 'self'; connect-src 'self' " + apiOrigin(),
          },
        ],
      },
    ]
  },
}

export default nextConfig
