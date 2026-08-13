export const INTRO_SEEN_STORAGE_KEY = 'coach-merche-intro-seen'

export const AVATAR_SRC = '/assets/brand/coach-avatar-intro.png'
/** Green logo — splash intro only; app chrome keeps the gold logo. */
export const LOGO_GREEN_SRC = '/assets/brand/logo-coach-merche-green.png'

/** Timeline total duration (ms): avatar 1s + logo bounce/zoom 2s. */
export const INTRO_TOTAL_MS = 3000

/** Phase durations (ms). */
export const INTRO_PHASE_MS = {
  avatar: 1000,
  logo: 2000,
} as const

/** Skip button appears after this delay (ms). */
export const INTRO_SKIP_DELAY_MS = 500
