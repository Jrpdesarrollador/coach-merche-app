import { isSupabaseConfigured } from '@/lib/supabase'

export function HomePage() {
  return (
    <section className="flex flex-1 flex-col justify-center gap-6 py-8">
      <p className="text-sm tracking-[0.18em] text-[var(--brand-gold)] uppercase">
        Coach Merche
      </p>
      <h1 className="text-4xl leading-tight text-[var(--text-primary)]">
        Entrena tu mejor versión
      </h1>
      <p className="max-w-[28ch] text-base leading-relaxed text-[var(--text-secondary)]">
        La experiencia digital de tus clases, entrenamientos y progreso. Setup y
        arquitectura listos.
      </p>
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 shadow-[var(--shadow-soft)]">
        <p className="text-sm text-[var(--text-muted)]">Estado del entorno</p>
        <p className="mt-2 text-base text-[var(--text-primary)]">
          {isSupabaseConfigured
            ? 'Supabase conectado (variables detectadas).'
            : 'Supabase pendiente: configura .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'}
        </p>
      </div>
    </section>
  )
}
