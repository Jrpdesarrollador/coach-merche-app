import { PWA_BADGE_URL, PWA_ICON_URL } from './notification-assets.ts'
import { postDetailUrl } from './post-content.ts'

export interface RichPushPayload {
  title: string
  body: string
  url: string
  icon: string
  badge: string
  tag: string
  actions?: Array<{ action: string; title: string }>
}

export function buildNewPostPush(input: {
  postId: string
  title: string
  excerpt: string
}): RichPushPayload {
  const safeTitle = input.title.trim() || 'Nueva novedad'
  return {
    title: '✨ Merche ha publicado algo nuevo',
    body: safeTitle.length > 90 ? `${safeTitle.slice(0, 87)}…` : safeTitle,
    url: postDetailUrl(input.postId),
    icon: PWA_ICON_URL,
    badge: PWA_BADGE_URL,
    tag: `new_post:${input.postId}`,
    actions: [{ action: 'open', title: 'Ver novedad' }],
  }
}

export function buildClassReminderPush(input: {
  classId: string
  workoutTitle: string
  dateLabel: string
  timeLabel: string
  location: string
}): RichPushPayload {
  const location = input.location.trim() || 'tu centro habitual'
  return {
    title: '💪 Tu clase es mañana',
    body: `${input.workoutTitle} · ${input.dateLabel} a las ${input.timeLabel} · ${location}`,
    url: '/clases',
    icon: PWA_ICON_URL,
    badge: PWA_BADGE_URL,
    tag: `class_reminder:${input.classId}`,
    actions: [{ action: 'open', title: 'Ver clases' }],
  }
}
