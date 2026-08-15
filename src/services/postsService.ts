import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Database, Post } from '@/types'
import { serviceError } from './errors'

type PostInsert = Database['public']['Tables']['posts']['Insert']
type PostUpdate = Database['public']['Tables']['posts']['Update']
export type PostMediaType = Database['public']['Tables']['posts']['Row']['media_type']

export interface PublishPostNotificationResult {
  recipientCount: number
  alreadySent: boolean
  pushSent: number
  emailsSent: number
  pushAttempted: number
  emailsAttempted: number
  emailsFailed: number
  pushFailed: number
  pushSubscriptionCount: number
  vapidConfigured: boolean
  resendConfigured: boolean
  markedSent: boolean
  note?: string
  deliverySummary?: string
  emailErrors?: string[]
  pushErrors?: string[]
  /** true when email/push delivery failed; the post itself is still published */
  failed: boolean
  /** Human-readable reason when failed or partially delivered */
  failureReason?: string
}

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

async function getPublishedById(id: string): Promise<Post | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('published', true)
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

const EMPTY_NOTIFICATION_RESULT: PublishPostNotificationResult = {
  recipientCount: 0,
  alreadySent: false,
  pushSent: 0,
  emailsSent: 0,
  pushAttempted: 0,
  emailsAttempted: 0,
  emailsFailed: 0,
  pushFailed: 0,
  pushSubscriptionCount: 0,
  vapidConfigured: false,
  resendConfigured: false,
  markedSent: false,
  failed: false,
}

/** Envía email + push tras publicar. Los avisos in-app los crea el trigger SQL. */
async function publishPostNotifications(
  postId: string,
  options?: { force?: boolean },
): Promise<PublishPostNotificationResult> {
  if (!isSupabaseConfigured) {
    return { ...EMPTY_NOTIFICATION_RESULT, failed: true }
  }

  try {
    if (options?.force) {
      await supabase.rpc('reset_post_notifications', { p_post_id: postId })
    }

    const { data: prep, error: prepError } = await supabase.rpc('publish_post_notifications', {
      p_post_id: postId,
    })

    if (prepError) {
      console.warn('[posts] publish_post_notifications failed', prepError)
      return { ...EMPTY_NOTIFICATION_RESULT, failed: true }
    }

    const prepRow = prep as {
      already_sent?: boolean
      recipient_count?: number
    } | null

    if (prepRow?.already_sent) {
      return {
        ...EMPTY_NOTIFICATION_RESULT,
        recipientCount: prepRow.recipient_count ?? 0,
        alreadySent: true,
      }
    }

    const { data, error } = await supabase.functions.invoke('notify-new-post', {
      body: { post_id: postId, force: options?.force ?? false },
    })

    if (error) {
      console.warn('[posts] notify-new-post failed', error)
      return {
        ...EMPTY_NOTIFICATION_RESULT,
        recipientCount: prepRow?.recipient_count ?? 0,
        failed: true,
        failureReason: 'No se pudo conectar con el servicio de avisos. Comprueba que las Edge Functions están desplegadas.',
      }
    }

    const result = data as {
      ok?: boolean
      already_sent?: boolean
      recipient_count?: number
      marked_sent?: boolean
      delivery_summary?: string
      push?: {
        attempted?: number
        sent?: number
        failed?: number
        skipped_no_vapid?: boolean
        vapid_configured?: boolean
        subscription_count?: number
        errors?: string[]
      }
      email?: {
        attempted?: number
        sent?: number
        failed?: number
        skipped?: number
        resend_configured?: boolean
      }
      email_errors?: string[]
      push_errors?: string[]
      error?: string
    } | null

    if (result?.already_sent) {
      return {
        ...EMPTY_NOTIFICATION_RESULT,
        recipientCount: prepRow?.recipient_count ?? 0,
        alreadySent: true,
        failureReason: result.delivery_summary ?? 'Los avisos push/email ya se enviaron. Usa «Reenviar avisos».',
        failed: true,
      }
    }

    if (result?.ok === false) {
      console.warn('[posts] notify-new-post returned error', result)
      return {
        ...EMPTY_NOTIFICATION_RESULT,
        recipientCount: prepRow?.recipient_count ?? 0,
        failed: true,
        failureReason: result.error ?? 'El servicio de avisos devolvió un error.',
      }
    }

    const pushAttempted = result?.push?.attempted ?? 0
    const pushSent = result?.push?.sent ?? 0
    const pushFailed = result?.push?.failed ?? 0
    const pushSubscriptionCount = result?.push?.subscription_count ?? 0
    const emailsAttempted = result?.email?.attempted ?? 0
    const emailsSent = result?.email?.sent ?? 0
    const emailsFailed = result?.email?.failed ?? 0
    const vapidConfigured = result?.push?.vapid_configured ?? false
    const resendConfigured = result?.email?.resend_configured ?? false
    const emailErrors = result?.email_errors
    const pushErrors = result?.push_errors
    const deliverySummary = result?.delivery_summary
    const markedSent = result?.marked_sent ?? false

    const deliveryFailed =
      pushSent === 0 &&
      emailsSent === 0 &&
      (pushAttempted > 0 || emailsAttempted > 0 || Boolean(deliverySummary))

    let failureReason = deliverySummary
    if (!failureReason && emailsFailed > 0) {
      failureReason = emailErrors?.[0] ?? `${emailsFailed} email(s) no enviados.`
    } else if (!failureReason && pushAttempted > 0 && pushSent === 0) {
      failureReason = pushErrors?.[0] ?? 'Push no entregado a ningún dispositivo.'
    }

    return {
      recipientCount: result?.recipient_count ?? prepRow?.recipient_count ?? 0,
      alreadySent: false,
      pushSent,
      emailsSent,
      pushAttempted,
      emailsAttempted,
      emailsFailed,
      pushFailed,
      pushSubscriptionCount,
      vapidConfigured,
      resendConfigured,
      markedSent,
      deliverySummary,
      emailErrors,
      pushErrors,
      failed: deliveryFailed,
      failureReason,
    }
  } catch (error) {
    console.warn('[posts] publishPostNotifications unexpected error', error)
    return { ...EMPTY_NOTIFICATION_RESULT, failed: true }
  }
}

export const postsService = {
  getLatestPublished,
  getPublishedById,
  listPublished,
  listAll,
  createPost,
  updatePost,
  publishPostNotifications,
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
