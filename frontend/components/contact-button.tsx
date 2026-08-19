'use client'

import { Mail, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { mailtoHref, whatsappHref, type Job } from '@/lib/data'

/**
 * Botón(es) de contacto directo para una vacante.
 * - Abre WhatsApp (wa.me) con mensaje prellenado si hay número.
 * - Abre el correo (mailto) con asunto y cuerpo prellenados si hay email.
 * Si existen ambos, WhatsApp es la acción principal y el correo un botón secundario.
 */
export function ContactButton({ job, className }: { job: Job; className?: string }) {
  const wa = whatsappHref(job)
  const mail = mailtoHref(job)

  if (!wa && !mail) return null

  const stop = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-display text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition-transform active:scale-[0.98]"
        >
          <MessageCircle className="size-[18px]" strokeWidth={2.4} />
          Contactar por WhatsApp
        </a>
      ) : null}

      {mail ? (
        wa ? (
          <a
            href={mail}
            onClick={stop}
            aria-label="Contactar por correo"
            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-card text-foreground transition-colors hover:bg-muted"
          >
            <Mail className="size-[18px]" />
          </a>
        ) : (
          <a
            href={mail}
            onClick={stop}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-display text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition-transform active:scale-[0.98]"
          >
            <Mail className="size-[18px]" strokeWidth={2.4} />
            Contactar por correo
          </a>
        )
      ) : null}
    </div>
  )
}
