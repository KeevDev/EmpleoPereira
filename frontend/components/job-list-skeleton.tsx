/** Esqueleto de carga con la misma silueta que una tarjeta de vacante. */
export function JobListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando vacantes…</span>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-3xl border border-border bg-card p-4"
          aria-hidden="true"
        >
          <div className="flex items-start gap-3">
            <div className="size-12 shrink-0 rounded-2xl bg-muted" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/3 rounded bg-muted" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-24 rounded-full bg-muted" />
            <div className="h-6 w-20 rounded-full bg-muted" />
          </div>
          <div className="mt-4 h-11 rounded-2xl bg-muted" />
        </div>
      ))}
    </div>
  )
}
