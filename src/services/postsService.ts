import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Post } from '@/types'
import { serviceError } from './errors'

/** Publicación publicada más reciente. */
async function getLatestPublished(): Promise<Post | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw serviceError(error)
  return data
}

export const postsService = {
  getLatestPublished,
}
