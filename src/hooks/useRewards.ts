import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase'
import { rewardsService, toFriendlyMessage, type RewardsOverview } from '@/services'

interface UseRewardsResult {
  overview: RewardsOverview | null
  loading: boolean
  error: string | null
  notConfigured: boolean
  refetch: () => void
}

export function useRewards(userId: string | undefined): UseRewardsResult {
  const [refreshToken, setRefreshToken] = useState(0)
  const [overview, setOverview] = useState<RewardsOverview | null>(null)
  const [loading, setLoading] = useState(Boolean(userId && isSupabaseConfigured))
  const [error, setError] = useState<string | null>(null)
  const notConfigured = !isSupabaseConfigured

  const refetch = useCallback(() => setRefreshToken((token) => token + 1), [])

  useEffect(() => {
    if (!userId) {
      setOverview(null)
      setLoading(false)
      setError(null)
      return
    }

    if (!isSupabaseConfigured) {
      setOverview(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await rewardsService.getOverview(userId!)
        if (cancelled) return
        setOverview(data)
      } catch (loadError) {
        if (cancelled) return
        setOverview(null)
        setError(toFriendlyMessage(loadError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [userId, refreshToken])

  return { overview, loading, error, notConfigured, refetch }
}
