-- ============================================================
-- Coach Merche App — Notificaciones automáticas al publicar post
-- ============================================================

alter table public.posts
  add column if not exists notification_sent_at timestamptz;

-- Al despublicar, permite reenviar avisos en la siguiente publicación.
create or replace function public.posts_clear_notification_sent()
returns trigger
language plpgsql
as $$
begin
  if coalesce(old.published, false) and not new.published then
    new.notification_sent_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_clear_notification_sent on public.posts;
create trigger posts_clear_notification_sent
  before update of published on public.posts
  for each row execute function public.posts_clear_notification_sent();

-- ------------------------------------------------------------
-- notify_new_post — avisos in-app al publicar por primera vez
-- ------------------------------------------------------------
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
  where p.role = 'user'
    and p.approval_status = 'approved';

  return new;
end;
$$;

drop trigger if exists posts_notify_new on public.posts;
create trigger posts_notify_new
  after insert or update of published on public.posts
  for each row execute function public.notify_new_post();

-- ------------------------------------------------------------
-- publish_post_notifications — prepara envío email/push (solo admin)
-- ------------------------------------------------------------
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
  where p.role = 'user'
    and p.approval_status = 'approved';

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

revoke all on function public.publish_post_notifications(uuid) from public;
grant execute on function public.publish_post_notifications(uuid) to authenticated;

-- ------------------------------------------------------------
-- mark_post_notifications_sent — marca envío completado (service role)
-- ------------------------------------------------------------
create or replace function public.mark_post_notifications_sent(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts
  set notification_sent_at = now()
  where id = p_post_id
    and published = true
    and notification_sent_at is null;

  return found;
end;
$$;

revoke all on function public.mark_post_notifications_sent(uuid) from public;
grant execute on function public.mark_post_notifications_sent(uuid) to service_role;
