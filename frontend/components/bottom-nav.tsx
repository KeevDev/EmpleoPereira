'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bookmark, Home, Map, Plus, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

// Dos destinos a cada lado del botón de publicar, para que la barra quede
// simétrica. Este es el único sitio donde se define la navegación.
const leftItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/mapa', label: 'Mapa', icon: Map },
]

const rightItems = [
  { href: '/urgentes', label: 'Urgentes', icon: Zap },
  { href: '/guardados', label: 'Guardados', icon: Bookmark },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass relative flex items-center justify-between rounded-[1.75rem] px-3 py-2">
        {/* Items de la izquierda */}
        <div className="flex flex-1 items-center justify-around">
          {leftItems.map((item) => (
            <NavButton key={item.href} {...item} active={pathname === item.href} />
          ))}
        </div>

        {/* Botón central destacado: Publicar */}
        <div className="flex w-16 shrink-0 justify-center">
          <Link
            href="/publicar"
            aria-label="Publicar empleo"
            className={cn(
              'flex size-14 -translate-y-5 items-center justify-center rounded-full',
              'bg-primary text-primary-foreground shadow-lg shadow-primary/40',
              'ring-4 ring-background transition-transform active:scale-95',
              pathname === '/publicar' && 'ring-accent',
            )}
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Items de la derecha */}
        <div className="flex flex-1 items-center justify-around">
          {rightItems.map((item) => (
            <NavButton key={item.href} {...item} active={pathname === item.href} />
          ))}
        </div>
      </div>
    </nav>
  )
}

function NavButton({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} />
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </Link>
  )
}
