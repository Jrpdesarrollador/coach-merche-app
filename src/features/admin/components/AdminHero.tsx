import { Logo } from '@/components/brand'

/** Cabecera premium del panel admin, inspirada en preview.html. */
export function AdminHero() {
  return (
    <section className="relative overflow-hidden rounded-[26px] border border-line-gold bg-linear-to-br from-green-deep/95 via-bg-primary/90 to-bg-primary px-6 py-7 shadow-premium sm:px-7 sm:py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 right-5 font-display text-[250px] leading-none font-black text-lime/[0.035] select-none"
      >
        M
      </div>

      <Logo
        size="lg"
        decorative
        className="relative z-[2] mb-4 sm:absolute sm:top-1/2 sm:right-7 sm:mb-0 sm:-translate-y-1/2 sm:opacity-95"
      />

      <div className="relative z-[3] max-w-2xl sm:pr-44">
        <p className="text-[11px] font-black tracking-[0.18em] text-lime uppercase">
          Panel interactivo · iPad · móvil · ordenador
        </p>
        <h1 className="mt-2 font-display text-[clamp(2.2rem,6vw,3.4rem)] leading-[0.92] tracking-[-0.04em] text-ink uppercase">
          Control <span className="text-gold">de Clases</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
          Gestiona reservas, pagos y avisos de tu comunidad. Diseñado para usarse con el
          dedo en iPad y móvil, además de ordenador.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-line-olive bg-green-deep/80 px-3 py-2 text-xs text-ink-soft">
            💶 <b className="text-lime">7 €</b> por clase
          </span>
          <span className="rounded-full border border-line-olive bg-green-deep/80 px-3 py-2 text-xs text-ink-soft">
            📅 <b className="text-lime">Martes y jueves</b>
          </span>
        </div>
      </div>
    </section>
  )
}
