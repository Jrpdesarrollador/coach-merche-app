import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AVATAR_SRC,
  INTRO_PHASE_MS,
  INTRO_TOTAL_MS,
  INTRO_SEEN_STORAGE_KEY,
  INTRO_SKIP_DELAY_MS,
  LOGO_GREEN_SRC,
} from '@/features/splash/constants'
import './splash-intro.css'

type IntroPhase = 'avatar' | 'logo'

interface SplashIntroProps {
  onComplete: () => void
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

export function SplashIntro({ onComplete }: SplashIntroProps) {
  const [phase, setPhase] = useState<IntroPhase>('avatar')
  const [exiting, setExiting] = useState(false)
  const completedRef = useRef(false)

  const finish = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    sessionStorage.setItem(INTRO_SEEN_STORAGE_KEY, '1')
    setExiting(true)
    window.setTimeout(onComplete, 420)
  }, [onComplete])

  useEffect(() => {
    if (prefersReducedMotion()) {
      finish()
      return
    }

    void preloadImage(AVATAR_SRC)
    void preloadImage(LOGO_GREEN_SRC)

    const logoTimer = window.setTimeout(() => setPhase('logo'), INTRO_PHASE_MS.avatar)
    const doneTimer = window.setTimeout(finish, INTRO_TOTAL_MS)

    return () => {
      window.clearTimeout(logoTimer)
      window.clearTimeout(doneTimer)
    }
  }, [finish])

  if (prefersReducedMotion()) return null

  const showLogo = phase === 'logo'

  return (
    <div
      className={`splash-intro${exiting ? ' is-exiting' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Introducción Coach Merche"
    >
      <div className="splash-intro__backdrop" aria-hidden="true" />

      <div className="splash-intro__stage">
        <div
          className={`splash-intro__avatar-wrap${showLogo ? ' is-fading' : ''}`}
          aria-hidden={showLogo}
        >
          <img
            className="splash-intro__avatar"
            src={AVATAR_SRC}
            alt="Coach Merche"
            decoding="sync"
            fetchPriority="high"
          />
        </div>

        <div
          className={`splash-intro__logo-wrap${showLogo ? ' is-active' : ''}`}
          aria-hidden={!showLogo}
        >
          <div className="splash-intro__glow" aria-hidden="true" />
          <img
            className="splash-intro__logo"
            src={LOGO_GREEN_SRC}
            width={1024}
            height={1024}
            alt="Logo Coach Merche"
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </div>

      <button
        type="button"
        className="splash-intro__skip"
        style={{ animationDelay: `${INTRO_SKIP_DELAY_MS}ms` }}
        onClick={finish}
      >
        Saltar
      </button>
    </div>
  )
}
