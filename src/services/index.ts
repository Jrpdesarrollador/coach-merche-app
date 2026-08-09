/**
 * Capa de servicios centralizada.
 * Toda consulta a Supabase vive aquí, organizada por dominio
 * (auth, profiles y, en fases siguientes, classes, bookings, workouts,
 * posts, rewards y attendance). Los componentes nunca llaman a `supabase`.
 */

export { authService, type SignUpOutcome } from './authService'
export { profileService, type ProfileUpdate } from './profileService'
export {
  ServiceError,
  SUPABASE_NOT_CONFIGURED_MESSAGE,
  serviceError,
  toFriendlyMessage,
} from './errors'
