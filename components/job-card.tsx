'use client'

import { useEffect, useRef, useState } from 'react'
import { Bookmark, Clock, Flag, MapPin, Navigation, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { reportJob } from '@/lib/api'
import { formatDistance } from '@/lib/geo'
import { timeAgo } from '@/lib/time'
import type { Job, ReportReason } from '@/lib/types'
import { ContactButton } from '@/components/contact-button'

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'scam', label: 'Parece estafa' },
  { value: 'spam', label: 'Es publicidad' },
  { value: 'expired', label: 'Ya no existe' },
  { value: 'offensive', label: 'Ofensiva' },
]

export function JobCard({
  job,
  saved = false,
  onToggleSave,
  onClick,
  distanceKm,
}: {
  job: Job
  saved?: boolean
  onToggleSave?: (id: string) => void
  onClick?: (id: string) => void
  /** Distancia hasta quien mira, si compartió su ubicación. */
  distanceKm?: number
}) {
  const posted = timeAgo(job.postedAt)
  const location = [job.neighborhood, job.cityName].filter(Boolean).join(', ')

  return (
    <article
      onClick={() => onClick?.(job.id)}
      className="relative overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      {job.urgent ? (
        <span className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-2xl bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
          <Zap className="size-3" strokeWidth={2.5} />
          Urgente
        </span>
      ) : null}

      <div className="flex items-start gap-3">
        <div
          className="grid size-12 shrink-0 place-items-center rounded-2xl text-base font-extrabold text-white"
          style={{ backgroundColor: job.logoColor }}
          aria-hidden="true"
        >
          {job.company.charAt(0)}
        </div>

        <div className="min-w-0 flex-1 pr-14">
          <h3 className="font-display text-base font-bold leading-snug text-balance">{job.title}</h3>
          <p className="truncate text-sm text-muted-foreground">{job.company}</p>
          {job.publisherName ? (
            <p className="truncate text-xs text-muted-foreground/80">
              Publicado por {job.publisherName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Tag>{job.type}</Tag>
        {job.category ? <Tag variant="accent">{job.category}</Tag> : null}
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
        {location ? (
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="size-4 shrink-0 text-primary" />
            <span className="truncate">{location}</span>
          </span>
        ) : null}
        {posted ? (
          <span className="flex shrink-0 items-center gap-1">
            <Clock className="size-4" />
            {posted}
          </span>
        ) : null}
        {distanceKm !== undefined ? (
          <span className="flex shrink-0 items-center gap-1 font-semibold text-foreground">
            <Navigation className="size-4 text-primary" />a {formatDistance(distanceKm)}
          </span>
        ) : null}
      </div>

      {job.description ? <Description text={job.description} /> : null}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="font-display text-base font-extrabold text-foreground">
          {job.salary ?? 'A convenir'}
        </span>
        <button
          type="button"
          aria-label={saved ? 'Quitar de guardados' : 'Guardar vacante'}
          aria-pressed={saved}
          onClick={(e) => {
            e.stopPropagation()
            onToggleSave?.(job.id)
          }}
          className={cn(
            'grid size-9 place-items-center rounded-full border transition-colors',
            saved
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:text-foreground',
          )}
        >
          <Bookmark className="size-[18px]" fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <ContactButton job={job} className="mt-3" />

      <ReportControl jobId={job.id} />
    </article>
  )
}

/**
 * La descripción, recortada a tres líneas.
 *
 * El botón solo aparece cuando el texto de verdad no cabe. Eso depende del
 * ancho de la tarjeta, no del número de caracteres, así que se mide el nodo
 * en lugar de adivinarlo: en el mapa la tarjeta es más estrecha que en el
 * tablón y el mismo texto se desborda en un sitio y en el otro no.
 */
function Description({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState(false)

  useEffect(() => {
    // Ya desplegado no hay nada que medir, y medir daría siempre "cabe":
    // el botón de recoger desaparecería al pulsarlo.
    if (expanded) return

    const el = ref.current
    if (!el) return

    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [text, expanded])

  return (
    <div className="mt-3">
      <p
        ref={ref}
        className={cn(
          // El backend conserva los saltos de línea del formulario.
          'whitespace-pre-line text-sm leading-relaxed text-muted-foreground',
          !expanded && 'line-clamp-3',
        )}
      >
        {text}
      </p>
      {clamped ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
          className="mt-1 text-xs font-semibold text-primary underline-offset-2 hover:underline"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      ) : null}
    </div>
  )
}

/**
 * Cualquiera puede publicar sin identificarse, así que cualquiera tiene que
 * poder avisar de una estafa. Es el único control que le queda a la comunidad.
 */
function ReportControl({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')

  const send = async (reason: ReportReason) => {
    setStatus('sending')
    try {
      await reportJob(jobId, reason)
    } catch {
      // Un reporte fallido no debe dar más información de la cuenta ni
      // interrumpir a quien está buscando trabajo.
    } finally {
      setStatus('done')
      setOpen(false)
    }
  }

  if (status === 'done') {
    return (
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Gracias por avisar. Vamos a revisarla.
      </p>
    )
  }

  return (
    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
      {open ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason.value}
              type="button"
              disabled={status === 'sending'}
              onClick={() => send(reason.value)}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {reason.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-2 py-1 text-[11px] font-semibold text-muted-foreground underline"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mx-auto flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Flag className="size-3" />
          Reportar vacante
        </button>
      )}
    </div>
  )
}

function Tag({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'accent'
}) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-semibold',
        variant === 'accent'
          ? 'bg-accent/25 text-accent-foreground'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}
