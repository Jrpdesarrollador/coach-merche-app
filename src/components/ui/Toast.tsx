import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertIcon, CheckIcon, TrophyIcon } from '@/components/icons'
import { cn } from '@/utils/cn'
import { ToastContext, type ToastTone } from './toastContext'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

const TOAST_DURATION_MS = 3200

const toneStyles: Record<ToastTone, string> = {
  success: 'border-line-lime text-lime',
  error: 'border-danger/40 text-danger',
  reward: 'border-line-lime text-lime',
}

const toneIcons: Record<ToastTone, ReactNode> = {
  success: <CheckIcon width={18} height={18} />,
  error: <AlertIcon width={18} height={18} />,
  reward: <TrophyIcon width={18} height={18} />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+0.75rem)] z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex w-full max-w-[var(--app-max-width)] animate-slide-up items-center gap-2.5 rounded-lg border bg-surface-elevated px-4 py-3 shadow-premium',
              toneStyles[toast.tone],
            )}
          >
            {toneIcons[toast.tone]}
            <p className="text-sm font-medium text-ink">{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
