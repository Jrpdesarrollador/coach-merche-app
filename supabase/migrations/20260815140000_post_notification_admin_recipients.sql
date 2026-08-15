-- ============================================================
-- Post notifications — include admins (view-as-alumna testing)
-- ============================================================
-- Admins on the view-mode allowlist use a single account to preview
-- the alumna experience. They must receive in-app / push / email avisos too.

-- Shared recipient filter: approved alumnas OR admins (coaches).
create or replace function public.is_post_notification_recipient(p_role text, p_approval_status text)
returns boolean
language sql
immutable
as $$
  select (p_role = 'user' and p_approval_status = 'approved') or p_role = 'admin';
$$;

create or replace function public.notify_new_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_body text;
begin
  if not new.published then
    return new;
  end if;

  if tg_op = 'UPDATE' and coalesce(old.published, false) then
    return new;
  end if;

  v_body := left(
    coalesce(nullif(trim(new.content), ''), 'Hay novedades en la app. Entra para ver más.'),
    500
  );

  insert into public.notifications (user_id, type, title, body, metadata)
  select
    p.id,
    'new_post',
    coalesce(nullif(trim(new.title), ''), 'Nueva publicación'),
    v_body,
    jsonb_build_object('post_id', new.id)
  from public.profiles p
  where public.is_post_notification_recipient(p.role, p.approval_status);

  return new;
end;
$$;

create or replace function public.publish_post_notifications(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
  v_recipient_count integer;
  v_excerpt text;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_post
  from public.posts
  where id = p_post_id;

  if not found then
    raise exception 'POST_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not v_post.published then
    raise exception 'POST_NOT_PUBLISHED' using errcode = 'P0001';
  end if;

  if v_post.notification_sent_at is not null then
    return jsonb_build_object(
      'already_sent', true,
      'recipient_count', 0,
      'post_id', p_post_id
    );
  end if;

  select count(*)::int into v_recipient_count
  from public.profiles p
  where public.is_post_notification_recipient(p.role, p.approval_status);

  v_excerpt := left(
    coalesce(nullif(trim(v_post.content), ''), 'Hay novedades en la app. Entra para ver más.'),
    160
  );

  return jsonb_build_object(
    'already_sent', false,
    'recipient_count', v_recipient_count,
    'post_id', p_post_id,
    'title', v_post.title,
    'excerpt', v_excerpt
  );
end;
$$;
