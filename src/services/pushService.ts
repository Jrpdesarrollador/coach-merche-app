import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { ServiceError, SUPABASE_NOT_CONFIGURED_MESSAGE, serviceError } from './errors'

export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface PushSubscriptionPayload {
  endpoint: string
  keys: PushSubscriptionKeys
}

function subscriptionToPayload(subscription: PushSubscription): PushSubscriptionPayload {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth

  if (!json.endpoint || !p256dh || !auth) {
    throw new ServiceError('No hemos podido activar los avisos push. Inténtalo de nuevo.')
  }

  return {
    endpoint: json.endpoint,
    keys: { p256dh, auth },
  }
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)
  }

  const payload = subscriptionToPayload(subscription)
  const { error } = await supabase.rpc('upsert_push_subscription', {
    p_endpoint: payload.endpoint,
    p_keys: { ...payload.keys },
  })

  if (error) throw serviceError(error)
}

async function removeSubscription(endpoint: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)
  }

  const { error } = await supabase.rpc('delete_push_subscription', {
    p_endpoint: endpoint,
  })

  if (error) throw serviceError(error)
}

export const pushService = {
  saveSubscription,
  removeSubscription,
  subscriptionToPayload,
}
