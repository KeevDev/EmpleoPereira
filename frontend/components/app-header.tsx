import { DevContactButton } from '@/components/dev-contact'
import { NotificationBell } from '@/components/notification-bell'

export function AppHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 bg-background/80 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-balance">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/*
            El acceso al mensaje acompaña a todas las pantallas: con el tablón
            lleno, el pie del feed queda a decenas de vacantes de distancia.
            `action` solo sustituye a la campana, que es lo que las pantallas
            secundarias apagan pasando un hueco vacío.
          */}
          <DevContactButton />
          {action ?? <NotificationBell />}
        </div>
      </div>
    </header>
  )
}
