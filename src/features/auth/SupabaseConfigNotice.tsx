import { AlertIcon } from '@/components/icons'

/** Aviso honesto para cuando la app aún no apunta a ningún proyecto Supabase. */
export function SupabaseConfigNotice() {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-md border border-warning/35 bg-warning/10 px-3.5 py-3"
    >
      <AlertIcon width={18} height={18} className="mt-0.5 shrink-0 text-warning" />
      <p className="text-xs leading-relaxed text-ink-soft">
        Todavía no hemos conectado la app con el servidor, así que de momento no se puede
        entrar ni crear una cuenta. En cuanto esté lista, esta pantalla funcionará con
        normalidad.
      </p>
    </div>
  )
}
