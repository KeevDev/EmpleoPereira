import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { BottomNav } from '@/components/bottom-nav'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Reconstruir Empleo | Pereira, Dosquebradas y Santa Rosa',
  description:
    'Encuentra y publica vacantes de empleo en las zonas afectadas por el terremoto. Reconstruyendo el Eje Cafetero, juntos.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Reconstruir',
  },
  icons: {
    icon: '/icon-192.png',
    // Apple pide 180×180 exactos; dárselo a 512 lo obliga a reescalar.
    apple: '/apple-icon.png',
  },
}

/**
 * Render por petición en todas las rutas.
 *
 * Es obligatorio para que la Content-Security-Policy con nonce funcione: el
 * nonce cambia en cada petición, así que Next tiene que generar el HTML en
 * ese momento para poder firmar sus propios <script>. Con las páginas
 * prerenderizadas el nonce de la cabecera no coincidiría con nada y
 * 'strict-dynamic' bloquearía todo el JavaScript de la aplicación.
 *
 * El coste es bajo: estas pantallas piden sus datos a la API desde el
 * navegador, así que el HTML que se genera aquí es solo el armazón.
 */
export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#d33a2c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background">
      <body className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}>
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background">
          <div className="flex-1 pb-28">{children}</div>
          <BottomNav />
        </div>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
