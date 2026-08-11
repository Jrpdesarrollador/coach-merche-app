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
    <header className="flex items-center justify-between gap-2 py-1">
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
            <Logo size="md" decorative priority />
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
