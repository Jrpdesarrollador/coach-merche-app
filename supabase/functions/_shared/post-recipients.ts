import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/** Approved alumnas + admins (coaches testing view-as-alumna). Mirrors SQL is_post_notification_recipient. */
export async function fetchPostNotificationRecipientIds(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .or('and(role.eq.user,approval_status.eq.approved),role.eq.admin')

  if (error) throw error
  return (data ?? []).map((row) => row.id as string)
}
