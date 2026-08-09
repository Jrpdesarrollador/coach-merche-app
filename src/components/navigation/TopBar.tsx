import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/brand'
import { ChevronLeftIcon } from '@/components/icons'
import { IconButton } from '@/components/ui/IconButton'

interface TopBarProps {
  title?: string
  showBack?: boolean
  action?: ReactNode
}

export function TopBar({ title, showBack = false, action }: TopBarProps) {
  const navigate = useNavigate()

  return (
    <header className="flex h-14 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        {showBack && (
          <IconButton
            label="Volver"
            icon={<ChevronLeftIcon />}
            onClick={() => navigate(-1)}
            className="-ml-2"
          />
        )}
        {title ? (
          <h1 className="truncate font-display text-xl text-ink">{title}</h1>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <Logo size="sm" decorative />
            <span className="font-display text-sm tracking-[0.22em] text-gold uppercase">
              Coach Merche
            </span>
          </div>
        )}
      </div>
      {action}
    </header>
  )
}
