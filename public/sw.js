/* eslint-disable no-undef */

/**
 * Service worker de Reconstruir Empleo.
 *
 * Solo hace una cosa: recibir los avisos de vacantes nuevas y abrirlos. No
 * cachea nada ni intercepta peticiones — la aplicación pide sus datos a una
 * API en otro dominio y un caché mal puesto aquí sería una vacante caducada
 * que se sigue viendo.
 *
 * Vive en /public para que su ámbito sea la raíz del sitio. Cambiar de ruta
 * lo reduciría a ese subdirectorio y dejaría de recibir nada.
 */

const DB_NAME = 'reconstruir-empleo'
const DB_VERSION = 1
const STORE = 'ajustes'
const CONFIG_KEY = 'push'

const ICON = '/icon-192.png'

// Android ignora el color del badge y usa solo su canal alfa para recortar
// una silueta: por eso es un PNG monocromo aparte y no el icono de la app.
const BADGE = '/badge-96.png'

/** Un solo aviso a la vez en la bandeja: el nuevo reemplaza al anterior. */
const TAG = 'vacantes-nuevas'

self.addEventListener('install', () => {
  // Sin esperar a que se cierren las pestañas viejas: este worker no tiene
  // estado compartido que pueda quedar a medias.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

/**
 * Llega una tanda de vacantes nuevas.
 *
 * El servidor ya filtró por las categorías de esta suscripción, así que aquí
 * siempre hay algo que mostrar. Y hay que mostrarlo: la suscripción se pidió
 * con `userVisibleOnly`, y un push que no acaba en notificación gasta el
 * presupuesto que el navegador concede y termina costando el permiso.
 */
self.addEventListener('push', (event) => {
  const payload = leerPayload(event)

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: ICON,
      badge: BADGE,
      lang: 'es-CO',
      tag: TAG,
      renotify: true,
      // Se descarta sola al tocarla; no se queda fija en la bandeja.
      requireInteraction: false,
      data: { url: payload.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(abrir(event.notification.data?.url || '/'))
})

/**
 * El navegador rotó el endpoint de esta suscripción.
 *
 * Pasa sin aviso y sin que la persona toque nada. Si no se vuelve a
 * registrar aquí, deja de recibir avisos en silencio y no hay forma de que
 * se entere. La configuración quedó guardada en IndexedDB justo para esto:
 * el service worker no ve las variables de entorno del build.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(resuscribir())
})

/**
 * @returns {{ title: string, body: string, url: string }}
 */
function leerPayload(event) {
  const porDefecto = {
    title: 'Vacantes nuevas',
    body: 'Toca para verlas en el tablón.',
    url: '/',
  }

  if (!event.data) return porDefecto

  try {
    const data = event.data.json()

    return {
      title: typeof data.title === 'string' && data.title ? data.title : porDefecto.title,
      body: typeof data.body === 'string' && data.body ? data.body : porDefecto.body,
      // Solo rutas propias: un `url` con origen externo convertiría el aviso
      // en un redirector hacia donde quisiera quien mandase el push.
      url: typeof data.url === 'string' && data.url.startsWith('/') ? data.url : porDefecto.url,
    }
  } catch {
    return porDefecto
  }
}

/** Enfoca la pestaña que ya esté abierta, o abre una. */
async function abrir(ruta) {
  const url = new URL(ruta, self.location.origin)
  const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

  for (const ventana of ventanas) {
    if (new URL(ventana.url).origin === url.origin && 'focus' in ventana) {
      await ventana.focus()

      if ('navigate' in ventana) {
        await ventana.navigate(url.href).catch(() => {})
      }

      return
    }
  }

  await self.clients.openWindow(url.href)
}

async function resuscribir() {
  const config = await leerConfig()

  if (!config?.apiUrl || !config?.vapidKey) return

  try {
    const suscripcion = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlABytes(config.vapidKey),
    })

    await fetch(`${config.apiUrl}/api/v1/push/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'omit',
      mode: 'cors',
      body: JSON.stringify({
        ...suscripcion.toJSON(),
        categories: config.categories ?? [],
      }),
    })
  } catch {
    // Sin permiso, o el servicio de push no respondió. La aplicación vuelve
    // a intentarlo la próxima vez que alguien la abra.
  }
}

function leerConfig() {
  return new Promise((resolve) => {
    let peticion

    try {
      peticion = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)

      return
    }

    peticion.onupgradeneeded = () => {
      if (!peticion.result.objectStoreNames.contains(STORE)) {
        peticion.result.createObjectStore(STORE)
      }
    }

    peticion.onerror = () => resolve(null)

    peticion.onsuccess = () => {
      const db = peticion.result

      if (!db.objectStoreNames.contains(STORE)) {
        db.close()
        resolve(null)

        return
      }

      const lectura = db.transaction(STORE, 'readonly').objectStore(STORE).get(CONFIG_KEY)

      lectura.onsuccess = () => {
        resolve(lectura.result ?? null)
        db.close()
      }

      lectura.onerror = () => {
        resolve(null)
        db.close()
      }
    }
  })
}

/** La clave VAPID viaja en base64url y `subscribe` la quiere en bytes. */
function base64UrlABytes(base64Url) {
  const relleno = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const crudo = self.atob(base64)
  const bytes = new Uint8Array(crudo.length)

  for (let i = 0; i < crudo.length; i++) {
    bytes[i] = crudo.charCodeAt(i)
  }

  return bytes
}
