import { cn } from '@/utils/cn'

type LogoSize = 'sm' | 'md' | 'lg'

interface LogoProps {
  size?: LogoSize
  className?: string
  /** Marca el logo como decorativo cuando ya hay un texto que lo identifica. */
  decorative?: boolean
  /** El logo de cabecera es visible al instante: conviene cargarlo con prioridad. */
  priority?: boolean
}

const sizeClasses: Record<LogoSize, string> = {
  sm: 'size-9',
  md: 'size-14',
  lg: 'size-24',
}

export const LOGO_SRC = '/assets/brand/logo-coach-merche.png'

export function Logo({
  size = 'md',
  className,
  decorative = false,
  priority = false,
}: LogoProps) {
  return (
    <img
      src={LOGO_SRC}
      width={512}
      height={512}
      alt={decorative ? '' : 'Coach Merche'}
      aria-hidden={decorative || undefined}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={cn(
        'shrink-0 rounded-full object-contain select-none',
        sizeClasses[size],
        className,
      )}
    />
  )
}
