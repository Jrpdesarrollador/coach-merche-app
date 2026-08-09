import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '@/components/icons'
import { useOverlayBehavior } from '@/hooks/useOverlayBehavior'
import { IconButton } from './IconButton'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useOverlayBehavior(open, onClose)

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        className="relative z-10 w-full max-w-[var(--app-max-width)] animate-scale-in rounded-xl border border-line bg-surface shadow-premium"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-display text-lg text-ink">{title}</h2>
          <IconButton label="Cerrar" icon={<CloseIcon />} onClick={onClose} />
        </header>
        <div className="max-h-[60svh] overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <footer className="flex gap-2 border-t border-line px-4 py-3">{footer}</footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
