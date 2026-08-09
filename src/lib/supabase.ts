import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Cliente Supabase centralizado.
 * Sin variables de entorno válidas se crea un cliente placeholder
 * para no romper el arranque en Fase 0 (sin llamadas reales aún).
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)

export const appTimezone =
  import.meta.env.VITE_APP_TIMEZONE || 'Europe/Madrid'
