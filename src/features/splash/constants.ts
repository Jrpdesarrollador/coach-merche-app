export const INTRO_SEEN_STORAGE_KEY = 'coach-merche-intro-seen'

export const AVATAR_SRC = '/assets/brand/coach-avatar-intro.png'
export const LOGO_SRC = '/assets/brand/logo-coach-merche.png'

/** Timeline total duration (ms). */
export const INTRO_TOTAL_MS = 3000

/** Phase durations (ms). */
export const INTRO_PHASE_MS = {
  avatar: 1000,
  logo: 1000,
  zoom: 1000,
} as const
