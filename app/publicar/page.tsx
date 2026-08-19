'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  AlertCircle,
  Briefcase,
  Building2,
  CheckCircle2,
  DollarSign,
  Loader2,
  MapPin,
  MessageCircle,
  Send,
  Undo2,
  UserRound,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { Field, OptionPills, Select, TextArea, TextInput } from '@/components/form-fields'
import { PhoneInput } from '@/components/phone-input'
import { DevContact } from '@/components/dev-contact'
import { ApiError, fetchFormToken, publishJob } from '@/lib/api'
import { JOB_TYPES } from '@/lib/data'
import { rejectLocation } from '@/lib/geo'
import { composePhone, findPhoneCountry, DEFAULT_PHONE_COUNTRY } from '@/lib/phone'
import { useCatalog } from '@/lib/use-catalog'
import { OTHER_CATEGORY_SLUG, type JobTypeSlug, type PublishResult } from '@/lib/types'

const TYPE_LABELS = JOB_TYPES.map((t) => t.label)

// Leaflet necesita el navegador: se carga sin SSR.
const LocationPicker = dynamic(() => import('@/components/location-picker'), {
  ssr: false,
  loading: () => (
    <div className="grid size-full place-items-center bg-muted">
      <span className="text-sm font-medium text-muted-foreground">Cargando mapa…</span>
    </div>
  ),
})

export default function PublicarPage() {
  const { cities, categories } = useCatalog()

  const [typeLabel, setTypeLabel] = useState<string>(TYPE_LABELS[0])
  const [urgent, setUrgent] = useState(false)

  // El indicativo del contacto. Colombia por defecto: es de donde publica
  // casi todo el mundo, y así el caso normal no obliga a tocar nada.
  const [phoneCountry, setPhoneCountry] = useState(DEFAULT_PHONE_COUNTRY.code)

  // La ciudad es estado controlado porque el mapa tiene que recentrarse al
  // cambiarla, y el punto marcado deja de tener sentido si cambia el municipio.
  const [cityId, setCityId] = useState('')
  // Controlada para poder desplegar el campo de categoría nueva al
  // elegir "Otro".
  const [category, setCategory] = useState('')
  const [coords, setCoords] = useState<[number, number] | null>(null)

  const selectedCity = useMemo(
    () => cities.find((c) => c.id === cityId) ?? null,
    [cities, cityId],
  )

  // Aviso antes de enviar. La validación que manda es la del servidor.
  const locationWarning =
    coords && selectedCity
      ? rejectLocation(coords, selectedCity.center, selectedCity.name)
      : null
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<PublishResult | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const formRef = useRef<HTMLFormElement>(null)

  // El token se pide al abrir la pantalla: el backend mide cuánto tarda el
  // envío desde ese momento para descartar bots, así que cuanto antes se
  // solicite, mejor.
  const [formToken, setFormToken] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchFormToken(controller.signal)
      .then((token) => setFormToken(token.token))
      .catch(() => {
        if (!controller.signal.aborted) {
          setGeneralError('No pudimos conectar con el servidor. Recarga la página.')
        }
      })

    return () => controller.abort()
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (sending || !formToken || locationWarning) return

    setSending(true)
    setErrors({})
    setGeneralError(null)

    const form = new FormData(event.currentTarget)
    const value = (name: string) => (form.get(name) as string | null)?.trim() || undefined

    const typeSlug = (JOB_TYPES.find((t) => t.label === typeLabel)?.slug ??
      'full_time') as JobTypeSlug

    try {
      const response = await publishJob({
        formToken,
        title: value('title') ?? '',
        company: value('company') ?? '',
        publisherName: value('publisherName') ?? '',
        cityId,
        category,
        // Solo viaja cuando de verdad se está creando una categoría.
        ...(category === OTHER_CATEGORY_SLUG
          ? { categoryName: value('categoryName') }
          : {}),
        type: typeSlug,
        neighborhood: value('neighborhood'),
        salary: value('salary'),
        description: value('description') ?? '',
        urgent,
        // Si nadie tocó el mapa no se manda nada y el servidor ancla la
        // vacante al centro del municipio.
        ...(coords ? { latitude: coords[0], longitude: coords[1] } : {}),
        contactName: value('contactName'),
        // El campo solo lleva el número nacional; el indicativo sale del
        // desplegable y se une aquí, ya en E.164.
        whatsapp: composePhone(
          findPhoneCountry(phoneCountry).dial,
          value('whatsappNumber') ?? '',
        ) ?? undefined,
        email: value('email'),
        // Campo trampa: si un bot lo rellena, el backend descarta el envío.
        website: value('website') ?? '',
      })

      setResult(response)
      formRef.current?.reset()
      setCityId('')
      setCategory('')
      setCoords(null)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.errors)
        if (Object.keys(error.errors).length === 0) {
          setGeneralError(error.message)
        }

        // El token es de un solo uso: tras un intento fallido hay que pedir
        // otro o el siguiente envío se rechazará por reutilización.
        fetchFormToken()
          .then((token) => setFormToken(token.token))
          .catch(() => setFormToken(null))
      } else {
        setGeneralError('Ocurrió un error inesperado. Inténtalo de nuevo.')
      }
    } finally {
      setSending(false)
    }
  }

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <AppHeader title="Publicar empleo" subtitle="Ayuda a alguien a volver a trabajar" action={<span />} />

        <div className="mx-5 flex flex-col items-center gap-3 rounded-3xl border border-border bg-card px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-7" />
          </span>
          <div>
            {/*
              El saludo y el estado llegan por separado del servidor para
              poder darles distinto peso sin repetir el nombre dos veces.
            */}
            <p className="font-display text-lg font-bold text-pretty">
              {result.publisherName
                ? `¡Gracias, ${result.publisherName}, por colaborar con la situación!`
                : '¡Gracias por colaborar con la situación!'}
            </p>
            <p className="mt-1.5 text-sm text-pretty text-muted-foreground">
              {result.statusMessage}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Link
              href="/"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Ver vacantes
            </Link>
            <button
              type="button"
              onClick={() => {
                setResult(null)
                fetchFormToken()
                  .then((token) => setFormToken(token.token))
                  .catch(() => setFormToken(null))
              }}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-bold"
            >
              Publicar otra
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <AppHeader
        title="Publicar empleo"
        subtitle="Ayuda a alguien a volver a trabajar"
        action={<span />}
      />

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 px-5">
        {generalError ? <ErrorBanner message={generalError} /> : null}

        {/*
          Quién publica va delante de todo: es el único dato que habla de la
          persona y no del empleo, y preguntarlo al principio evita que se
          confunda con el contacto laboral del final.
        */}
        <Section icon={<UserRound className="size-4" />} title="¿Quién publica?">
          <Field
            label="Tu nombre"
            htmlFor="publisherName"
            hint="Aparecerá en la vacante como “Publicado por”."
          >
            <TextInput
              id="publisherName"
              name="publisherName"
              autoComplete="name"
              placeholder="Ej: Marcela"
              required
            />
            <FieldError errors={errors.publisherName} />
          </Field>
        </Section>

        <Section icon={<Briefcase className="size-4" />} title="Sobre el cargo">
          <Field label="Título de la vacante" htmlFor="title">
            <TextInput id="title" name="title" placeholder="Ej: Ayudante de construcción" required />
            <FieldError errors={errors.title} />
          </Field>

          <Field label="Tipo de contrato">
            <OptionPills options={TYPE_LABELS} value={typeLabel} onChange={setTypeLabel} />
            <FieldError errors={errors.type} />
          </Field>

          <Field label="Categoría" htmlFor="category">
            <Select
              id="category"
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
            >
              <option value="" disabled>
                Selecciona una categoría
              </option>
              {categories
                .filter((c) => c.slug !== OTHER_CATEGORY_SLUG)
                .map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              {/*
                Siempre al final y siempre presente, aunque la API todavía no
                haya respondido: es la única categoría que el sistema
                garantiza, y sin ella no habría forma de crear las demás.
              */}
              <option value={OTHER_CATEGORY_SLUG}>Otro (crear categoría)</option>
            </Select>
            <FieldError errors={errors.category} />
          </Field>

          {category === OTHER_CATEGORY_SLUG ? (
            <Field
              label="Nombre de la categoría nueva"
              htmlFor="categoryName"
              hint="Quedará disponible para quien publique después. Ej: Reparación de techos"
            >
              <TextInput
                id="categoryName"
                name="categoryName"
                placeholder="Ej: Reparación de techos"
                maxLength={40}
                required
                autoFocus
              />
              <FieldError errors={errors.categoryName} />
            </Field>
          ) : null}
        </Section>

        <Section icon={<Building2 className="size-4" />} title="Empresa">
          <Field label="Nombre de la empresa" htmlFor="company">
            <TextInput id="company" name="company" placeholder="Ej: Reconstruye Eje" required />
            <FieldError errors={errors.company} />
          </Field>
        </Section>

        <Section icon={<MapPin className="size-4" />} title="Ubicación">
          <Field label="Ciudad" htmlFor="cityId">
            <Select
              id="cityId"
              name="cityId"
              value={cityId}
              onChange={(event) => {
                setCityId(event.target.value)
                // El punto marcado pertenecía al municipio anterior.
                setCoords(null)
              }}
              required
            >
              <option value="" disabled>
                Selecciona una ciudad
              </option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </Select>
            <FieldError errors={errors.cityId} />
          </Field>

          <Field label="Barrio / sector" htmlFor="neighborhood">
            <TextInput id="neighborhood" name="neighborhood" placeholder="Ej: Cuba, Centro..." />
            <FieldError errors={errors.neighborhood} />
          </Field>

          {/*
            El mapa solo aparece con una ciudad elegida: sin ella no hay dónde
            centrarlo ni contra qué validar la distancia.
          */}
          {selectedCity ? (
            <Field
              label="Punto exacto en el mapa"
              hint={
                coords
                  ? 'Toca otro punto o arrastra el marcador para ajustarlo.'
                  : `Opcional. Toca el mapa para marcar dónde queda el trabajo. Si no lo marcas, se usa el centro de ${selectedCity.name}.`
              }
            >
              <div className="overflow-hidden rounded-2xl border border-border">
                <div className="h-56 w-full">
                  <LocationPicker
                    center={selectedCity.center}
                    value={coords}
                    onChange={setCoords}
                  />
                </div>
              </div>

              {coords ? (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">
                    Ubicación marcada: {coords[0].toFixed(4)}, {coords[1].toFixed(4)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCoords(null)}
                    className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground underline transition-colors hover:text-foreground"
                  >
                    <Undo2 className="size-3" />
                    Quitar
                  </button>
                </div>
              ) : null}

              {locationWarning ? (
                <p role="alert" className="flex items-start gap-1.5 text-xs font-medium text-primary">
                  <AlertCircle className="mt-px size-3.5 shrink-0" />
                  {locationWarning}
                </p>
              ) : null}

              <FieldError errors={errors.latitude ?? errors.longitude} />
            </Field>
          ) : null}
        </Section>

        <Section icon={<DollarSign className="size-4" />} title="Remuneración y detalle">
          <Field
            label="Salario o pago"
            htmlFor="salary"
            hint="Puedes indicar mensual, por día o auxilio."
          >
            <TextInput id="salary" name="salary" placeholder="Ej: $1.450.000 / mes" />
            <FieldError errors={errors.salary} />
          </Field>
          <Field
            label="Descripción"
            htmlFor="description"
            hint="Mínimo 20 caracteres. No incluyas enlaces: se rechazan automáticamente."
          >
            <TextArea
              id="description"
              name="description"
              placeholder="Describe las funciones, requisitos y condiciones..."
              required
            />
            <FieldError errors={errors.description} />
          </Field>
        </Section>

        <Section icon={<MessageCircle className="size-4" />} title="Contacto laboral">
          <Field label="Nombre de contacto" htmlFor="contactName">
            <TextInput id="contactName" name="contactName" placeholder="Ej: Carlos" />
            <FieldError errors={errors.contactName} />
          </Field>
          <Field
            label="WhatsApp"
            htmlFor="whatsappNumber"
            hint="Elige el indicativo y escribe el número sin él."
          >
            <PhoneInput
              id="whatsappNumber"
              name="whatsappNumber"
              countryCode={phoneCountry}
              onCountryChange={setPhoneCountry}
            />
            <FieldError errors={errors.whatsapp} />
          </Field>
          <Field label="Correo (opcional)" htmlFor="email" hint="Indica al menos WhatsApp o correo.">
            <TextInput
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="empleos@empresa.com"
            />
            <FieldError errors={errors.email} />
          </Field>
        </Section>

        {/*
          Campo trampa. Está fuera de la vista y del foco del teclado: una
          persona nunca lo rellena, un bot que completa todo el formulario sí.
        */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] opacity-0">
          <label htmlFor="website">No rellenes este campo</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <FieldError errors={errors.formToken} />

        {/* Marcar como urgente */}
        <button
          type="button"
          onClick={() => setUrgent((v) => !v)}
          aria-pressed={urgent}
          className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors ${
            urgent ? 'border-primary bg-primary/10' : 'border-border bg-card'
          }`}
        >
          <span>
            <span className="block text-sm font-semibold">Marcar como urgente</span>
            <span className="block text-xs text-muted-foreground">
              Aparecerá destacada en el feed
            </span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              urgent ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                urgent ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>

        <button
          type="submit"
          disabled={sending || !formToken || locationWarning !== null}
          className="mt-1 flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-display text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {sending ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Publicando…
            </>
          ) : (
            <>
              <Send className="size-5" />
              Publicar vacante
            </>
          )}
        </button>

        <p className="pb-2 text-center text-xs text-muted-foreground text-pretty">
          Revisamos cada vacante antes de publicarla. Tus datos de contacto se muestran a quien
          busca empleo.
        </p>
      </form>

      <DevContact />
    </div>
  )
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null

  return (
    <p role="alert" className="flex items-start gap-1.5 text-xs font-medium text-primary">
      <AlertCircle className="mt-px size-3.5 shrink-0" />
      {errors[0]}
    </p>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-primary" />
      {message}
    </p>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3.5 rounded-3xl border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-accent/25 text-accent-foreground">
          {icon}
        </span>
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </section>
  )
}
