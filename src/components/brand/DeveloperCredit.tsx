import { cn } from '@/utils/cn'

export const DEVELOPER_LOGO_SRC = '/assets/brand/jrpdesarrollador-logo.png'
const DEVELOPER_URL = 'https://github.com/Jrpdesarrollador'

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
      <a
        href={DEVELOPER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'group inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors duration-200',
          'text-[10px] tracking-[0.16em] text-ink-muted uppercase',
          'hover:text-ink-soft focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lime/40',
          subtle && 'opacity-70 hover:opacity-100',
        )}
        aria-label="Desarrollada por Jrpdesarrollador — abrir perfil en GitHub"
      >
        <img
          src={DEVELOPER_LOGO_SRC}
          alt=""
          aria-hidden
          width={18}
          height={18}
          loading="lazy"
          decoding="async"
          className="size-[18px] shrink-0 rounded-[4px] object-contain opacity-75 transition-opacity duration-200 group-hover:opacity-100"
        />
        <span className="leading-none">
          App by{' '}
          <span className="font-medium text-ink-soft/90 transition-colors duration-200 group-hover:text-lime/90">
            Jrpdesarrollador
          </span>
        </span>
      </a>
    </footer>
  )
}
