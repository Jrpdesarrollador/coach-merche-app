import { AlertIcon } from '@/components/icons'

const PROD_CHECKLIST = [
  'Vercel → Project → Settings → Environment Variables (del proyecto, no del team).',
  'Variables exactas: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (marcadas Production + Preview).',
  'Valor URL: https://<PROJECT_REF>.supabase.co (desde Supabase → Project Settings → Data API).',
  'Valor clave: anon public o publishable (eyJ… o sb_publishable_…), nunca service_role.',
  'Deployments → último deployment → … → Redeploy → desmarca “Use existing Build Cache”.',
  'Tras el build, en Build Logs debe aparecer: [verify-vite-env] OK — Supabase URL: …',
] as const

/** Aviso honesto para cuando la app aún no apunta a ningún proyecto Supabase. */
export function SupabaseConfigNotice() {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-md border border-warning/35 bg-warning/10 px-3.5 py-3"
    >
      <AlertIcon width={18} height={18} className="mt-0.5 shrink-0 text-warning" />
      <div className="space-y-2 text-xs leading-relaxed text-ink-soft">
        <p>
          Todavía no hemos conectado la app con el servidor, así que de momento no se puede
          entrar ni crear una cuenta.
        </p>
        {import.meta.env.PROD ? (
          <>
            <p>
              Vite incluye las variables <code className="text-ink">VITE_*</code> solo en el{' '}
              <strong>build</strong>, no después. Si el aviso sigue tras añadirlas en Vercel,
              el deployment activo se construyó sin ellas.
            </p>
            <p className="font-medium text-ink">Checklist en Vercel:</p>
            <ol className="list-decimal space-y-1 pl-4">
              {PROD_CHECKLIST.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="text-[11px] text-ink-soft/90">
              Comprobación local:{' '}
              <code className="text-ink">npm run verify:production</code>
            </p>
          </>
        ) : (
          <p>
            Revisa <code className="text-ink">.env.local</code> (
            <code className="text-ink">VITE_SUPABASE_URL</code>,{' '}
            <code className="text-ink">VITE_SUPABASE_ANON_KEY</code>) y reinicia{' '}
            <code className="text-ink">npm run dev</code>.
          </p>
        )}
      </div>
    </div>
  )
}
