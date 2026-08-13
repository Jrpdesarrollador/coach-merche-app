import { useCallback, useEffect, useRef, useState } from 'react'
import { LOGO_SRC as BRAND_LOGO_SRC } from '@/components/brand/Logo'
import {
  AVATAR_SRC,
  INTRO_PHASE_MS,
  INTRO_TOTAL_MS,
  INTRO_SEEN_STORAGE_KEY,
} from '@/features/splash/constants'
import './splash-intro.css'

type IntroPhase = 'avatar' | 'logo' | 'zoom'

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
    void preloadImage(BRAND_LOGO_SRC)

    const logoTimer = window.setTimeout(() => setPhase('logo'), INTRO_PHASE_MS.avatar)
    const zoomTimer = window.setTimeout(
      () => setPhase('zoom'),
      INTRO_PHASE_MS.avatar + INTRO_PHASE_MS.logo,
    )
    const doneTimer = window.setTimeout(finish, INTRO_TOTAL_MS)

    return () => {
      window.clearTimeout(logoTimer)
      window.clearTimeout(zoomTimer)
      window.clearTimeout(doneTimer)
    }
  }, [finish])

  if (prefersReducedMotion()) return null

  const showLogo = phase === 'logo' || phase === 'zoom'
  const isZooming = phase === 'zoom'

  return (
    <div
      className={`splash-intro${exiting ? ' is-exiting' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Introducción Coach Merche"
    >
      <div className="splash-intro__backdrop" aria-hidden="true" />
      <div className="splash-intro__streak" aria-hidden="true" />
      <div className="splash-intro__vignette" aria-hidden="true" />

      <div className="splash-intro__stage">
        <div
          className={`splash-intro__avatar-wrap${showLogo ? ' is-fading' : ''}`}
          aria-hidden={showLogo}
        >
          <img
            className="splash-intro__avatar"
            src={AVATAR_SRC}
            width={532}
            height={840}
            alt="Coach Merche señalando"
            decoding="sync"
            fetchPriority="high"
          />
          <p className="splash-intro__tagline">
            Entrena con <em>Coach Merche</em>
          </p>
        </div>

        <div
          className={`splash-intro__logo-wrap${showLogo ? ' is-visible' : ''}${isZooming ? ' is-zooming' : ''}`}
          aria-hidden={!showLogo}
        >
          <div className="splash-intro__glow" aria-hidden="true" />
          <img
            className="splash-intro__logo"
            src={BRAND_LOGO_SRC}
            width={1024}
            height={1024}
            alt="Logo Coach Merche"
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </div>

      <button type="button" className="splash-intro__skip" onClick={finish}>
        Saltar
      </button>
    </div>
  )
}
