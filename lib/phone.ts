// Teléfonos de contacto.
//
// El tablón es de Pereira, así que Colombia es el caso normal y va primero.
// El resto de la lista son los países desde los que de verdad se publica o se
// contrata aquí: la diáspora del Eje y las empresas que reclutan desde fuera.
// No es un catálogo ISO completo a propósito — un desplegable de doscientas
// entradas es peor de usar que uno de quince.

export type PhoneCountry = {
  /** ISO 3166-1 alfa-2. Es la clave: +1 lo comparten varios países. */
  code: string
  name: string
  /** Indicativo, sin el "+". */
  dial: string
  flag: string
  /** Cómo se escribe un móvil de ese país, para el marcador de posición. */
  example: string
}

export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { code: 'CO', name: 'Colombia', dial: '57', flag: '🇨🇴', example: '300 111 2233' },
  { code: 'VE', name: 'Venezuela', dial: '58', flag: '🇻🇪', example: '412 123 4567' },
  { code: 'EC', name: 'Ecuador', dial: '593', flag: '🇪🇨', example: '99 123 4567' },
  { code: 'PE', name: 'Perú', dial: '51', flag: '🇵🇪', example: '987 654 321' },
  { code: 'PA', name: 'Panamá', dial: '507', flag: '🇵🇦', example: '6123 4567' },
  { code: 'CR', name: 'Costa Rica', dial: '506', flag: '🇨🇷', example: '8312 3456' },
  { code: 'MX', name: 'México', dial: '52', flag: '🇲🇽', example: '55 1234 5678' },
  { code: 'CL', name: 'Chile', dial: '56', flag: '🇨🇱', example: '9 6123 4567' },
  { code: 'AR', name: 'Argentina', dial: '54', flag: '🇦🇷', example: '11 2345 6789' },
  { code: 'BR', name: 'Brasil', dial: '55', flag: '🇧🇷', example: '11 91234 5678' },
  { code: 'BO', name: 'Bolivia', dial: '591', flag: '🇧🇴', example: '712 34567' },
  { code: 'UY', name: 'Uruguay', dial: '598', flag: '🇺🇾', example: '94 123 456' },
  { code: 'PY', name: 'Paraguay', dial: '595', flag: '🇵🇾', example: '961 234567' },
  { code: 'ES', name: 'España', dial: '34', flag: '🇪🇸', example: '612 34 56 78' },
  { code: 'US', name: 'Estados Unidos', dial: '1', flag: '🇺🇸', example: '305 555 0123' },
  { code: 'CA', name: 'Canadá', dial: '1', flag: '🇨🇦', example: '416 555 0123' },
]

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0]

export function findPhoneCountry(code: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.code === code) ?? DEFAULT_PHONE_COUNTRY
}

/**
 * Une el indicativo elegido con lo que se escribió y devuelve el número en
 * E.164 sin el "+", que es lo que espera la API (y wa.me).
 *
 * Quien escribe un número no sigue ninguna convención, así que:
 *
 * - un "+" o un "00" delante significan "esto ya lleva el indicativo": se
 *   respeta lo escrito y se ignora el desplegable, para que elegir Colombia
 *   y pegar un +58 no acabe en 5758…;
 * - los ceros de salida nacionales (el 0 de Argentina, el 011…) se quitan:
 *   solo valen dentro del país y sobran en E.164;
 * - espacios, guiones y paréntesis se caen solos.
 *
 * Devuelve null si no queda nada, para poder omitir el campo.
 */
export function composePhone(dial: string, input: string): string | null {
  const trimmed = input.trim()

  if (trimmed === '') return null

  const digits = trimmed.replace(/\D/g, '')

  if (digits === '') return null

  if (trimmed.startsWith('+')) return digits

  if (digits.startsWith('00')) return digits.slice(2)

  return dial + digits.replace(/^0+/, '')
}
