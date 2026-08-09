import { Skeleton, SkeletonCard } from '@/components/ui'

/** Espera visible mientras se resuelve la sesión, para no parpadear al login. */
export function SessionLoader() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[var(--app-max-width)] flex-col gap-4 px-4 pt-[calc(var(--safe-top)+3.5rem)]">
      <Skeleton className="h-3 w-28" label="Preparando tu sesión" />
      <Skeleton className="h-9 w-52" />
      <div className="mt-2 flex flex-col gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
