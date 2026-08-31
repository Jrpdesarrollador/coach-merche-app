// Edge Function: eliminación definitiva de cuentas desde el panel de Merche.
//
// Solo una cuenta con role=admin puede invocarla. La service role permanece
// exclusivamente en Supabase y nunca se expone en el navegador.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

interface DeleteUserPayload {
  user_id?: unknown
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405)
  }

  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ ok: false, error: 'AUTH_REQUIRED' }, 401)
    }

    const payload = (await request.json()) as DeleteUserPayload
    const targetUserId = typeof payload.user_id === 'string' ? payload.user_id : ''

    if (!UUID_PATTERN.test(targetUserId)) {
      return jsonResponse({ ok: false, error: 'INVALID_USER_ID' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const publishableKey =
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
      throw new Error('Supabase environment is incomplete')
    }

    const callerClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser()

    if (callerError || !caller) {
      return jsonResponse({ ok: false, error: 'AUTH_REQUIRED' }, 401)
    }

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle()

    if (callerProfileError) throw callerProfileError
    if (callerProfile?.role !== 'admin') {
      return jsonResponse({ ok: false, error: 'FORBIDDEN' }, 403)
    }

    if (targetUserId === caller.id) {
      return jsonResponse({ ok: false, error: 'ADMIN_DELETE_NOT_ALLOWED' }, 403)
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', targetUserId)
      .maybeSingle()

    if (targetProfileError) throw targetProfileError
    if (!targetProfile) {
      return jsonResponse({ ok: false, error: 'USER_NOT_FOUND' }, 404)
    }
    if (targetProfile.role !== 'user') {
      return jsonResponse({ ok: false, error: 'ADMIN_DELETE_NOT_ALLOWED' }, 403)
    }

    // Supabase Auth no permite borrar una cuenta que aún sea propietaria de
    // objetos de Storage. En esta app las alumnas solo suben su avatar.
    const { data: avatarObjects, error: avatarListError } = await adminClient.storage
      .from('avatars')
      .list(targetUserId, { limit: 100 })

    if (avatarListError) throw avatarListError

    if (avatarObjects?.length) {
      const { error: avatarDeleteError } = await adminClient.storage
        .from('avatars')
        .remove(avatarObjects.map((file) => `${targetUserId}/${file.name}`))

      if (avatarDeleteError) throw avatarDeleteError
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId)
    if (deleteError) throw deleteError

    // auth.users -> profiles y los datos personales relacionados se eliminan
    // por las FK ON DELETE CASCADE.

    return jsonResponse({ ok: true, deleted_user_id: targetUserId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('admin-delete-user failed', message)
    return jsonResponse({ ok: false, error: 'DELETE_FAILED' }, 500)
  }
})
