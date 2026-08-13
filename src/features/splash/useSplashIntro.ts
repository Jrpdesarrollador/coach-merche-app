import { useCallback, useState } from 'react'
import { INTRO_SEEN_STORAGE_KEY } from '@/features/splash/constants'

function shouldShowIntro(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return sessionStorage.getItem(INTRO_SEEN_STORAGE_KEY) !== '1'
}

export function useSplashIntro() {
  const [visible, setVisible] = useState(shouldShowIntro)

  const complete = useCallback(() => {
    setVisible(false)
  }, [])

  return { visible, complete }
}
