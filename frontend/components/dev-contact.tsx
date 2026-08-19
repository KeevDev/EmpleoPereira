'use client'

import { Dialog } from '@base-ui/react/dialog'
import { Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { SheetContent } from '@/components/bottom-sheet'
import { cn } from '@/lib/utils'

/**
 * Mensaje de quien hizo la página: ideas que ayuden ante el terremoto y
 * avisos de fallos.
 *
 * Vive en dos sitios y con un solo texto. El pie cierra el feed para quien
 * baja hasta el final; el botón de la cabecera está siempre a la vista,
 * porque con el tablón lleno el pie queda a cincuenta vacantes de distancia.
 */
const EMAIL = 'serna0667@gmail.com'
const WHATSAPP_HANDLE = '@kevsrndev'

const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent(
  'Idea para Reconstruir Empleo',
)}`

function Message() {
  return (
    <p className="text-sm text-pretty text-muted-foreground">
      Esta página existe para los afectados por el terremoto. 🇨🇴❤️ Si tienes una idea
      que les pueda servir, o encuentras algo que no funciona,{' '}
      <strong className="font-semibold text-foreground">escríbeme y lo construimos.</strong>
    </p>
  )
}

function Contacts() {
  return (
    <div className="flex flex-col gap-2">
      <a
        href={MAILTO}
        className="flex items-center gap-2.5 rounded-2xl bg-muted px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted/70"
      >
        <span aria-hidden="true">📩</span>
        <span className="break-all">{EMAIL}</span>
      </a>

      {/*
        Sin enlace: WhatsApp solo abre chats por número, y un usuario no
        tiene URL pública. Un enlace roto sería peor que un texto que se
        puede copiar de un toque.
      */}
      <p className="flex items-center gap-2.5 rounded-2xl bg-muted px-4 py-3 text-sm font-semibold">
        <span aria-hidden="true">💬</span>
        <span>
          WhatsApp: <span className="select-all">{WHATSAPP_HANDLE}</span>
        </span>
      </p>
    </div>
  )
}

/** Pie del feed. */
export function DevContact() {
  return (
    <footer className="mx-5 mb-2 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-primary">
        <Lightbulb className="size-[18px]" />
        <span className="text-xs font-bold uppercase tracking-wider">¿Tienes una idea?</span>
      </div>

      <div className="mt-2 flex flex-col gap-4">
        <Message />
        <Contacts />
      </div>
    </footer>
  )
}

/**
 * El mismo mensaje, a un toque desde cualquier pantalla.
 *
 * `className` existe para el mapa, cuyo botón flota sobre las teselas y
 * necesita fondo translúcido y sombra en vez del borde de la cabecera.
 */
export function DevContactButton({ className }: { className?: string }) {
  const [abierta, setAbierta] = useState(false)

  return (
    <Dialog.Root open={abierta} onOpenChange={setAbierta}>
      <Dialog.Trigger
        aria-label="Proponer una idea o reportar un error"
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted',
          className,
        )}
      >
        <Lightbulb className="size-5" />
      </Dialog.Trigger>

      <SheetContent title="¿Tienes una idea?">
        <Message />
        <Contacts />
      </SheetContent>
    </Dialog.Root>
  )
}
