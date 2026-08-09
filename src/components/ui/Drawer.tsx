import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayBehavior } from '@/hooks/useOverlayBehavior'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Hoja inferior: patrón principal para formularios y acciones en móvil. */
export function Drawer({ open, onClose, title, children }: DrawerProps) {
  useOverlayBehavior(open, onClose)

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-[var(--app-max-width)] animate-slide-up rounded-t-xl border border-line bg-surface pb-[calc(var(--safe-bottom)+1rem)] shadow-premium"
      >
        <div className="flex justify-center pt-3">
          <span className="h-1 w-10 rounded-full bg-line" aria-hidden />
        </div>
        <header className="px-4 pt-3 pb-2">
          <h2 className="font-display text-xl text-ink">{title}</h2>
        </header>
        <div className="max-h-[70svh] overflow-y-auto px-4 pb-2">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
