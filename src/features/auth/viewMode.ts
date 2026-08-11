/** Emails que pueden alternar entre vista admin y alumna sin cambiar el rol en BD. */
export const VIEW_MODE_ALLOWLIST = [
  'jrodriguezpomeda@gmail.com',
  'merche.valverde@outlook.com',
] as const

export type ViewMode = 'admin' | 'user'

export const VIEW_MODE_STORAGE_KEY = 'coach-merche-view-mode'

const ALLOWLIST_LOWER = new Set(VIEW_MODE_ALLOWLIST.map((email) => email.toLowerCase()))

export function isEmailInViewModeAllowlist(email: string | undefined): boolean {
  if (!email) return false
  return ALLOWLIST_LOWER.has(email.toLowerCase())
}

export function readStoredViewMode(): ViewMode | null {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    if (stored === 'admin' || stored === 'user') return stored
    return null
  } catch {
    return null
  }
}

export function writeStoredViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  } catch {
    // localStorage puede no estar disponible (modo privado, etc.)
  }
}

export function defaultViewMode(role: 'user' | 'admin' | undefined): ViewMode {
  return role === 'admin' ? 'admin' : 'user'
}
