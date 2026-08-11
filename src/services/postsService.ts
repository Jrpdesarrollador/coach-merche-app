import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Database, Post } from '@/types'
import { serviceError } from './errors'

type PostInsert = Database['public']['Tables']['posts']['Insert']
type PostUpdate = Database['public']['Tables']['posts']['Update']
export type PostMediaType = Database['public']['Tables']['posts']['Row']['media_type']

const IMAGE_BUCKET = 'posts'
const VIDEO_BUCKET = 'post-media'

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime'])

function detectMediaType(file: File): PostMediaType {
  if (IMAGE_MIME.has(file.type)) return 'image'
  if (VIDEO_MIME.has(file.type)) return 'video'
  throw serviceError(new Error('Formato no válido. Usa JPG, PNG, WebP, MP4 o WebM.'))
}

function getPublicImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(imagePath)
  return data.publicUrl
}

function resolveImageUrl(post: Post): string | null {
  if (post.image_path) return getPublicImageUrl(post.image_path)
  return post.image_url
}

/** Publicación publicada más reciente. */
async function getLatestPublished(): Promise<Post | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw serviceError(error)
  return data
}

async function listPublished(): Promise<Post[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw serviceError(error)
  return data ?? []
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

async function uploadImage(file: File): Promise<string> {
  if (!isSupabaseConfigured) {
    throw serviceError(new Error('Supabase no configurado'))
  }
  if (!IMAGE_MIME.has(file.type)) {
    throw serviceError(new Error('La imagen debe ser JPG, PNG o WebP.'))
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) throw serviceError(error)
  return path
}

async function uploadVideo(file: File): Promise<string> {
  if (!isSupabaseConfigured) {
    throw serviceError(new Error('Supabase no configurado'))
  }
  if (!VIDEO_MIME.has(file.type)) {
    throw serviceError(new Error('El vídeo debe ser MP4, WebM o MOV.'))
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'mp4'
  const path = `${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) throw serviceError(error)
  return path
}

async function getSignedVideoUrl(videoPath: string, expiresIn = 3600): Promise<string | null> {
  if (!isSupabaseConfigured || !videoPath) return null

  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(videoPath, expiresIn)

  if (error) throw serviceError(error)
  return data?.signedUrl ?? null
}

async function removeStorageFile(bucket: string, path: string | null | undefined): Promise<void> {
  if (!isSupabaseConfigured || !path) return

  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw serviceError(error)
}

async function removePostMedia(post: Pick<Post, 'image_path' | 'video_path'>): Promise<void> {
  await removeStorageFile(IMAGE_BUCKET, post.image_path)
  await removeStorageFile(VIDEO_BUCKET, post.video_path)
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

async function deletePost(post: Post): Promise<void> {
  if (!isSupabaseConfigured) return

  if (post.image_path) {
    await removeStorageFile(IMAGE_BUCKET, post.image_path)
  }
  if (post.video_path) {
    await removeStorageFile(VIDEO_BUCKET, post.video_path)
  }

  const { error } = await supabase.from('posts').delete().eq('id', post.id)
  if (error) throw serviceError(error)
}

export const postsService = {
  getLatestPublished,
  listPublished,
  listAll,
  createPost,
  updatePost,
  deletePost,
  uploadImage,
  uploadVideo,
  getPublicImageUrl,
  getSignedVideoUrl,
  resolveImageUrl,
  detectMediaType,
  removePostMedia,
  IMAGE_BUCKET,
  VIDEO_BUCKET,
}
