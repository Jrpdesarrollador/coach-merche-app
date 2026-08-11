import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Database, Post } from '@/types'
import { serviceError } from './errors'

type PostInsert = Database['public']['Tables']['posts']['Insert']
type PostUpdate = Database['public']['Tables']['posts']['Update']

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

async function listAll(): Promise<Post[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw serviceError(error)
  return data ?? []
}

async function createPost(input: PostInsert): Promise<Post> {
  if (!isSupabaseConfigured) {
    throw serviceError(new Error('Supabase no configurado'))
  }

  const { data, error } = await supabase.from('posts').insert(input).select('*').single()
  if (error) throw serviceError(error)
  return data
}

async function updatePost(id: string, patch: PostUpdate): Promise<Post> {
  if (!isSupabaseConfigured) {
    throw serviceError(new Error('Supabase no configurado'))
  }

  const { data, error } = await supabase
    .from('posts')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw serviceError(error)
  return data
}

async function deletePost(id: string): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) throw serviceError(error)
}

export const postsService = {
  getLatestPublished,
  listAll,
  createPost,
  updatePost,
  deletePost,
}
