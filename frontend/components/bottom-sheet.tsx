'use client'

import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'

/**
 * El cuerpo de una hoja que sube desde abajo.
 *
 * `Dialog.Root` y el disparador se quedan en quien la usa, porque cada uno
 * tiene su propio botón; lo que se comparte es el armazón: fondo, panel,
 * cabecera y el área que hace scroll cuando el contenido no cabe.
 *
 * La altura está limitada al 85% de la ventana y el pie queda fuera del área
 * desplazable: en un móvil pequeño, el botón de confirmar tiene que seguir
 * viéndose sin bajar hasta el final.
 */
export function SheetContent({
  title,
  description,
  footer,
  children,
}: {
  title: string
  description?: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] transition-opacity duration-200 data-[closed]:opacity-0 data-[starting-style]:opacity-0" />

      <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-md flex-col gap-4 rounded-t-3xl border-t border-border bg-background px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 transition-transform duration-300 data-[closed]:translate-y-full data-[starting-style]:translate-y-full">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Dialog.Title className="font-display text-xl font-extrabold tracking-tight">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1 text-sm text-muted-foreground text-pretty">
                {description}
              </Dialog.Description>
            ) : null}
          </div>

          <Dialog.Close
            aria-label="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground"
          >
            <X className="size-4" />
          </Dialog.Close>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">{children}</div>

        {footer}
      </Dialog.Popup>
    </Dialog.Portal>
  )
}
