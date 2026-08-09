import { useContext } from 'react'
import { ToastContext, type ToastContextValue } from '@/components/ui/toastContext'

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider')
  }
  return context
}
