'use client'

/**
 * Configuración compartida con el service worker.
 *
 * El service worker corre fuera de la página: no ve `localStorage` ni las
 * variables del build. Cuando el navegador rota el endpoint de una
 * suscripción —lo hace solo, sin avisar— tiene que poder volver a
 * registrarla por su cuenta, y para eso necesita saber a qué API llamar y
 * con qué clave. IndexedDB es el único almacén que ambos ven.
 *
 * El esquema (nombre, versión y almacén) está duplicado en `public/sw.js`.
 * Si cambia aquí, cambia allí.
 */

const DB_NAME = 'reconstruir-empleo'
const DB_VERSION = 1
const STORE = 'ajustes'
const CONFIG_KEY = 'push'

export type PushConfig = {
  /** Origen de la API, sin barra final. */
  apiUrl: string
  /** Clave pública VAPID en base64url, tal como la sirve el backend. */
  vapidKey: string
  /** Slugs de categoría elegidos. Vacío = todas. */
  categories: string[]
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(DB_NAME, DB_VERSION)

    peticion.onupgradeneeded = () => {
      if (!peticion.result.objectStoreNames.contains(STORE)) {
        peticion.result.createObjectStore(STORE)
      }
    }

    peticion.onsuccess = () => resolve(peticion.result)
    peticion.onerror = () => reject(peticion.error)
    peticion.onblocked = () => reject(new Error('IndexedDB bloqueada'))
  })
}

/**
 * Nada de esto es crítico para la pantalla: si IndexedDB está deshabilitada
 * (navegación privada en algunos navegadores), los avisos siguen llegando y
 * lo único que se pierde es el re-registro automático tras una rotación.
 */
export async function saveConfig(config: PushConfig): Promise<void> {
  try {
    const db = await abrir()

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')

      tx.objectStore(STORE).put(config, CONFIG_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })

    db.close()
  } catch {
    // Sin almacén compartido, pero con avisos.
  }
}

export async function clearConfig(): Promise<void> {
  try {
    const db = await abrir()

    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')

      tx.objectStore(STORE).delete(CONFIG_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    })

    db.close()
  } catch {
    // Igual da: lo que manda es el estado de la suscripción en el navegador.
  }
}
