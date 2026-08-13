import { cn } from '@/utils/cn'

export const DEVELOPER_LOGO_SRC = '/assets/brand/jrpdesarrollador-logo.png'

interface DeveloperCreditProps {
  className?: string
  /** Más discreto en pantallas de acceso. */
  subtle?: boolean
}

/** Crédito de desarrollo — pie de marca integrado en los layouts de la app. */
export function DeveloperCredit({ className, subtle = false }: DeveloperCreditProps) {
  return (
    <footer
      className={cn(
        'flex justify-center print:hidden',
        !subtle && 'border-t border-line/25 bg-gradient-to-t from-transparent via-bg-primary/40 to-transparent pt-3',
        subtle && 'pt-1',
        className,
      )}
    >
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2 py-1',
          'text-[10px] tracking-[0.16em] text-ink-muted uppercase',
          subtle && 'opacity-70',
        )}
        aria-label="Desarrollada por Jrpdesarrollador"
      >
        <img
          src={DEVELOPER_LOGO_SRC}
          alt=""
          aria-hidden
          width={18}
          height={18}
          loading="lazy"
          decoding="async"
          className="size-[18px] shrink-0 rounded-[4px] object-contain opacity-75"
        />
        <span className="leading-none">
          App by{' '}
          <span className="font-medium text-ink-soft/90">
            Jrpdesarrollador
          </span>
        </span>
      </div>
    </footer>
  )
}
