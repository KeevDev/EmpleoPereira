'use client'

import { Dialog } from '@base-ui/react/dialog'
import { Bell, BellRing, Check, Share } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SheetContent } from '@/components/bottom-sheet'
import { Chip } from '@/components/chip'
import { useCatalog } from '@/lib/use-catalog'
import { usePush } from '@/lib/use-push'
import { cn } from '@/lib/utils'

/**
 * La campana y su hoja de ajustes.
 *
 * Es lo único de la aplicación que pide un permiso al navegador, así que el
 * permiso se pide aquí dentro y solo cuando alguien lo pulsa a propósito. Un
 * navegador pregunta una sola vez: quien rechaza en frío ya no puede
 * cambiarlo sin entrar en los ajustes del sistema.
 */
export function NotificationBell() {
  const [abierta, setAbierta] = useState(false)
  const { categories: catalogo } = useCatalog()
  const push = usePush()

  // Selección local: solo se manda al servidor al confirmar, para no
  // reescribir la suscripción con cada toque.
  const [seleccion, setSeleccion] = useState<string[]>([])

  useEffect(() => {
    setSeleccion(push.categories)
  }, [push.categories])

  // Sin Push API o sin claves en el servidor no hay nada que ofrecer: la
  // campana desaparece en vez de abrir una hoja que no lleva a ningún sitio.
  if (push.support === 'unsupported' || push.support === 'sin-servidor') {
    return null
  }

  const activa = push.subscribed
  const pendiente = push.support === 'listo' && !activa && push.permission === 'default'

  const alternar = (slug: string) => {
    setSeleccion((previa) =>
      previa.includes(slug) ? previa.filter((x) => x !== slug) : [...previa, slug],
    )
  }

  return (
    <Dialog.Root open={abierta} onOpenChange={setAbierta}>
      <Dialog.Trigger
        aria-label={activa ? 'Avisos activados' : 'Activar avisos de vacantes'}
        disabled={push.support === 'comprobando'}
        className={cn(
          'relative grid size-10 shrink-0 place-items-center rounded-full border transition-colors',
          activa
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card text-foreground',
        )}
      >
        {activa ? <BellRing className="size-5" /> : <Bell className="size-5" />}

        {/* El punto solo aparece cuando hay algo que activar. */}
        {pendiente ? (
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-primary ring-2 ring-card" />
        ) : null}
      </Dialog.Trigger>

      <SheetContent
        title="Avisos de vacantes"
        description="Te avisamos en cuanto publiquemos vacantes nuevas. Sin crear cuenta y sin dar tu correo."
        footer={
          push.support === 'listo' ? (
            <Acciones
              activa={activa}
              busy={push.busy}
              seleccionCambio={!mismasCategorias(seleccion, push.categories)}
              onActivar={() => push.enable(seleccion)}
              onGuardar={() => push.updateCategories(seleccion)}
              onDesactivar={() => push.disable()}
            />
          ) : null
        }
      >
        {push.support === 'necesita-instalar' ? (
          <InstalarEnIOS />
        ) : (
          <>
            <Categorias
              catalogo={catalogo}
              seleccion={seleccion}
              onTodas={() => setSeleccion([])}
              onAlternar={alternar}
            />

            {push.error ? (
              <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive text-pretty">
                {push.error}
              </p>
            ) : null}

            <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
              Guardamos la dirección de aviso que genera tu navegador y las categorías que marques.
              Ni tu IP, ni tu correo, ni un historial de lo que miras. Al desactivar, se borra.
            </p>
          </>
        )}
      </SheetContent>
    </Dialog.Root>
  )
}

function Categorias({
  catalogo,
  seleccion,
  onTodas,
  onAlternar,
}: {
  catalogo: { slug: string; name: string }[]
  seleccion: string[]
  onTodas: () => void
  onAlternar: (slug: string) => void
}) {
  if (catalogo.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Qué quieres que te avisemos
      </p>

      <div className="flex flex-wrap gap-2">
        <Chip activa={seleccion.length === 0} onClick={onTodas}>
          Todas
        </Chip>

        {catalogo.map((categoria) => (
          <Chip
            key={categoria.slug}
            activa={seleccion.includes(categoria.slug)}
            onClick={() => onAlternar(categoria.slug)}
          >
            {categoria.name}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function Acciones({
  activa,
  busy,
  seleccionCambio,
  onActivar,
  onGuardar,
  onDesactivar,
}: {
  activa: boolean
  busy: boolean
  seleccionCambio: boolean
  onActivar: () => void
  onGuardar: () => void
  onDesactivar: () => void
}) {
  if (!activa) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onActivar}
        className="rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? 'Activando…' : 'Activar avisos'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={onDesactivar}
        className="flex-1 rounded-full border border-border bg-card px-5 py-3.5 text-sm font-bold text-foreground disabled:opacity-60"
      >
        Desactivar
      </button>

      {seleccionCambio ? (
        <button
          type="button"
          disabled={busy}
          onClick={onGuardar}
          className="flex-1 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30 disabled:opacity-60"
        >
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
      ) : (
        <p className="flex flex-1 items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Check className="size-4" /> Activados
        </p>
      )}
    </div>
  )
}

/**
 * En iOS los avisos solo existen si la aplicación está en la pantalla de
 * inicio. No hay forma de provocar esa instalación desde el código: Safari
 * no expone `beforeinstallprompt`, así que lo único honesto es explicarlo.
 */
function InstalarEnIOS() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-bold">Primero instala la aplicación</p>
      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
        En iPhone y iPad los avisos solo funcionan con la aplicación en la pantalla de inicio.
      </p>
      <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <Share className="size-4 shrink-0" />
          Toca Compartir en la barra de Safari
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="grid size-4 shrink-0 place-items-center font-bold">
            +
          </span>
          Elige «Añadir a pantalla de inicio»
        </li>
        <li className="flex items-center gap-2">
          <Bell className="size-4 shrink-0" />
          Ábrela desde ahí y vuelve a esta campana
        </li>
      </ol>
    </div>
  )
}

function mismasCategorias(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join()
}
