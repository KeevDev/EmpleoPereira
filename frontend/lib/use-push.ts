'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, apiBaseUrl, fetchPushKey, subscribeToPush, unsubscribeFromPush } from '@/lib/api'
import { clearConfig, saveConfig } from '@/lib/push-config'

const STORAGE_KEY = 'reconstruir-empleo:avisos'

/**
 * `unsupported`        el navegador no tiene Push API.
 * `necesita-instalar`  iOS: solo funciona con la app en pantalla de inicio.
 * `sin-servidor`       la API no tiene claves VAPID configuradas.
 * `listo`              se puede pedir permiso.
 */
export type PushSupport = 'comprobando' | 'unsupported' | 'necesita-instalar' | 'sin-servidor' | 'listo'

type Estado = {
  support: PushSupport
  permission: NotificationPermission
  subscribed: boolean
  categories: string[]
  busy: boolean
  error: string | null
}

function leerCategorias(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []

    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function guardarCategorias(categories: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
  } catch {
    // Sin persistencia local: la suscripción del servidor sigue siendo la
    // que manda, esto solo alimenta la pantalla de ajustes.
  }
}

/** La clave VAPID viaja en base64url y `subscribe` la quiere en bytes. */
function base64UrlABytes(base64Url: string): Uint8Array {
  const relleno = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const crudo = window.atob(base64)
  const bytes = new Uint8Array(crudo.length)

  for (let i = 0; i < crudo.length; i++) {
    bytes[i] = crudo.charCodeAt(i)
  }

  return bytes
}

function esIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function estaInstalada(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari en iOS todavía usa esta propiedad propia.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * Avisos de vacantes nuevas.
 *
 * El permiso se pide solo cuando alguien lo pulsa a propósito, nunca al
 * cargar la página: un navegador solo pregunta una vez, y quien lo rechaza
 * en frío ya no puede volver atrás sin entrar en los ajustes del sistema.
 */
export function usePush() {
  const [estado, setEstado] = useState<Estado>({
    support: 'comprobando',
    permission: 'default',
    subscribed: false,
    categories: [],
    busy: false,
    error: null,
  })

  const vapidKey = useRef<string | null>(null)

  /** Guarda en el servidor y deja al service worker lo que necesita. */
  const sincronizar = useCallback(
    async (suscripcion: PushSubscription, categories: string[], key: string) => {
      const json = suscripcion.toJSON() as {
        endpoint?: string
        keys?: { p256dh?: string; auth?: string }
      }

      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error('El navegador devolvió una suscripción incompleta.')
      }

      const codificaciones = PushManager.supportedContentEncodings

      await subscribeToPush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        contentEncoding:
          !codificaciones || codificaciones.includes('aes128gcm') ? 'aes128gcm' : 'aesgcm',
        categories,
      })

      await saveConfig({ apiUrl: apiBaseUrl(), vapidKey: key, categories })
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    let vivo = true

    const parche = (cambios: Partial<Estado>) => {
      if (vivo) setEstado((previo) => ({ ...previo, ...cambios }))
    }

    async function arrancar() {
      const categories = leerCategorias()

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        parche({
          support: esIOS() && !estaInstalada() ? 'necesita-instalar' : 'unsupported',
          categories,
        })

        return
      }

      let key
      try {
        key = await fetchPushKey(controller.signal)
      } catch {
        // La API no responde: se trata como "sin servidor" en vez de dejar
        // la campana girando para siempre.
        parche({ support: 'sin-servidor', categories })

        return
      }

      if (!key.enabled || !key.publicKey) {
        parche({ support: 'sin-servidor', categories })

        return
      }

      vapidKey.current = key.publicKey

      const registro = await navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => null)

      // Sin service worker no hay avisos posibles, y hay que decirlo aquí:
      // más adelante `navigator.serviceWorker.ready` se quedaría esperando
      // para siempre a un registro que nunca llegó.
      if (!registro) {
        parche({ support: 'unsupported', categories })

        return
      }

      const suscripcion = await registro.pushManager.getSubscription()

      parche({
        support: 'listo',
        permission: Notification.permission,
        subscribed: suscripcion !== null,
        categories,
      })

      // Señal de vida: reenviar la suscripción en cada arranque es lo que
      // evita que el servidor la borre por inactividad, y lo que corrige un
      // endpoint que el navegador cambió mientras la app estaba cerrada.
      if (suscripcion) {
        await sincronizar(suscripcion, categories, key.publicKey).catch(() => {})
      }
    }

    void arrancar()

    return () => {
      vivo = false
      controller.abort()
    }
    // Solo al montar: `sincronizar` no tiene dependencias y volver a
    // ejecutar esto reharía el registro del service worker en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enable = useCallback(
    async (categories: string[]) => {
      const key = vapidKey.current

      if (!key) return

      setEstado((previo) => ({ ...previo, busy: true, error: null }))

      try {
        // El permiso primero y directamente desde el gesto: intercalar un
        // `await` largo antes hace que Safari lo descarte por no venir de
        // una interacción.
        const permiso = await Notification.requestPermission()

        if (permiso !== 'granted') {
          setEstado((previo) => ({
            ...previo,
            permission: permiso,
            busy: false,
            error:
              permiso === 'denied'
                ? 'Tu navegador tiene bloqueadas las notificaciones de este sitio. Se activan desde sus ajustes.'
                : null,
          }))

          return
        }

        const registro = await navigator.serviceWorker.ready

        const suscripcion =
          (await registro.pushManager.getSubscription()) ??
          (await registro.pushManager.subscribe({
            // Obligatorio en todos los navegadores actuales, y coherente con
            // lo que hace el service worker: cada push acaba en un aviso
            // visible.
            userVisibleOnly: true,
            applicationServerKey: base64UrlABytes(key),
          }))

        await sincronizar(suscripcion, categories, key)

        guardarCategorias(categories)

        setEstado((previo) => ({
          ...previo,
          permission: 'granted',
          subscribed: true,
          categories,
          busy: false,
          error: null,
        }))
      } catch (error) {
        setEstado((previo) => ({
          ...previo,
          busy: false,
          error:
            error instanceof ApiError
              ? error.message
              : 'No pudimos activar los avisos. Inténtalo de nuevo.',
        }))
      }
    },
    [sincronizar],
  )

  const disable = useCallback(async () => {
    setEstado((previo) => ({ ...previo, busy: true, error: null }))

    try {
      const registro = await navigator.serviceWorker.ready
      const suscripcion = await registro.pushManager.getSubscription()

      if (suscripcion) {
        // Primero el servidor: si se cancela en el navegador y luego falla
        // la llamada, queda una fila muerta a la que se sigue escribiendo.
        await unsubscribeFromPush(suscripcion.endpoint).catch(() => {})
        await suscripcion.unsubscribe()
      }

      await clearConfig()

      setEstado((previo) => ({ ...previo, subscribed: false, busy: false }))
    } catch {
      setEstado((previo) => ({
        ...previo,
        busy: false,
        error: 'No pudimos desactivar los avisos. Inténtalo de nuevo.',
      }))
    }
  }, [])

  /** Cambia las categorías sin volver a pedir permiso. */
  const updateCategories = useCallback(
    async (categories: string[]) => {
      guardarCategorias(categories)
      setEstado((previo) => ({ ...previo, categories }))

      const key = vapidKey.current

      if (!estado.subscribed || !key) return

      setEstado((previo) => ({ ...previo, busy: true }))

      try {
        const registro = await navigator.serviceWorker.ready
        const suscripcion = await registro.pushManager.getSubscription()

        if (suscripcion) await sincronizar(suscripcion, categories, key)

        setEstado((previo) => ({ ...previo, busy: false }))
      } catch {
        setEstado((previo) => ({
          ...previo,
          busy: false,
          error: 'Guardamos tu elección aquí, pero no pudimos avisar al servidor.',
        }))
      }
    },
    [estado.subscribed, sincronizar],
  )

  return { ...estado, enable, disable, updateCategories }
}
