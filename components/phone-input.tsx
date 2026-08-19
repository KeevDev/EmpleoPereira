'use client'

import { Select, TextInput } from '@/components/form-fields'
import { PHONE_COUNTRIES, findPhoneCountry } from '@/lib/phone'

/**
 * Indicativo + número, en una sola línea.
 *
 * El indicativo es estado del formulario; el número queda sin controlar para
 * que `form.reset()` lo limpie solo tras publicar. La unión de los dos la
 * hace `composePhone` al enviar, no este componente.
 */
export function PhoneInput({
  id,
  name,
  countryCode,
  onCountryChange,
}: {
  id: string
  name: string
  countryCode: string
  onCountryChange: (code: string) => void
}) {
  const country = findPhoneCountry(countryCode)

  return (
    <div className="flex items-stretch gap-2">
      <Select
        aria-label="Indicativo del país"
        value={countryCode}
        onChange={(event) => onCountryChange(event.target.value)}
        className="w-[7.5rem] shrink-0 px-3 text-center"
      >
        {PHONE_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} +{c.dial}
          </option>
        ))}
      </Select>

      <TextInput
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={country.example}
        maxLength={20}
      />
    </div>
  )
}
