import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  findSupabaseConfigProblems,
  formatSupabaseConfigWarning,
} from '@/lib/supabaseConfig'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
/** Acepta anon key clásica o publishable key (`sb_publishable_...`) de Supabase. */
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const configProblems = findSupabaseConfigProblems(supabaseUrl, supabaseAnonKey)

export const isSupabaseConfigured = configProblems.length === 0

if (!isSupabaseConfigured) {
  console.warn(formatSupabaseConfigWarning(configProblems))
}

/**
 * Cliente Supabase centralizado y tipado.
 *
 * Sin variables de entorno se crea un cliente con valores de marcador para
 * que la app arranque igualmente durante el desarrollo; cualquier llamada
 * real fallará de forma controlada y `isSupabaseConfigured` permite
 * avisar en la interfaz.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

export const APP_TIMEZONE = import.meta.env.VITE_APP_TIMEZONE || 'Europe/Madrid'
