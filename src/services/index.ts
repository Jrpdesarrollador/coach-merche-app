/**
 * Capa de servicios centralizada.
 * Toda consulta a Supabase vive aquí, organizada por dominio
 * (auth, profiles y, en fases siguientes, classes, bookings, workouts,
 * posts, rewards y attendance). Los componentes nunca llaman a `supabase`.
 */

export { adminService, type AdminDashboardStats } from './adminService'
export { adminUsersService } from './adminUsersService'
export { authService, type SignUpOutcome } from './authService'
export { profileService, type ProfileUpdate } from './profileService'
export { classesService, type ClassWithWorkout } from './classesService'
export { bookingsService } from './bookingsService'
export { postsService } from './postsService'
export { workoutsService } from './workoutsService'
export {
  rewardsService,
  type AdminUserReward,
  type PendingRewardDelivery,
  type RewardDisplayState,
  type RewardProgress,
  type RewardWithStatus,
  type RewardsOverview,
} from './rewardsService'
export { pushService, type PushSubscriptionPayload } from './pushService'
export { notificationsService, type SendNotificationInput } from './notificationsService'
export { manualAdminService, CLASS_PRICE_CENTS } from './manualAdminService'
export { historyAdminService, type HistoryEntry, type HistoryEntryKind } from './historyAdminService'
export { paymentsService, type PaymentUpsert } from './paymentsService'
export { chatService } from './chatService'
export { reportsService, type ReportData } from './reportsService'
export {
  ServiceError,
  SUPABASE_NOT_CONFIGURED_MESSAGE,
  serviceError,
  toFriendlyMessage,
} from './errors'
