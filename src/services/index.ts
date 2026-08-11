/**
 * Capa de servicios centralizada.
 * Toda consulta a Supabase vive aquí, organizada por dominio
 * (auth, profiles y, en fases siguientes, classes, bookings, workouts,
 * posts, rewards y attendance). Los componentes nunca llaman a `supabase`.
 */

export { adminService, type AdminDashboardStats } from './adminService'
export { authService, type SignUpOutcome } from './authService'
export { profileService, type ProfileUpdate } from './profileService'
export { classesService, type ClassWithWorkout } from './classesService'
export { bookingsService } from './bookingsService'
export { postsService } from './postsService'
export { workoutsService } from './workoutsService'
export { rewardsService, type RewardProgress } from './rewardsService'
export { notificationsService, type SendNotificationInput } from './notificationsService'
export { paymentsService, type PaymentUpsert } from './paymentsService'
export {
  ServiceError,
  SUPABASE_NOT_CONFIGURED_MESSAGE,
  serviceError,
  toFriendlyMessage,
} from './errors'
