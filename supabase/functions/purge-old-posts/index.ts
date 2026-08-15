// Edge Function: purga publicaciones con más de 30 días + media en storage
//
// Invocar diariamente con Supabase Cron:
//   supabase functions deploy purge-old-posts
//   Cron: 0 3 * * * (03:00 UTC)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: deletedCount, error } = await supabase.rpc('purge_old_posts')

    if (error) throw error

    return jsonResponse({
      ok: true,
      posts_deleted: deletedCount ?? 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ ok: false, error: message }, 500)
  }
})
