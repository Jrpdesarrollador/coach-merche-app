import { Logo } from '@/components/brand'

/** Cabecera premium fija del panel admin — idéntica en todos los módulos. */
export function AdminHero() {
  return (
    <section className="relative overflow-hidden rounded-[22px] border border-line-gold bg-linear-to-br from-green-deep/95 via-bg-primary/90 to-bg-primary px-5 py-4 shadow-premium sm:rounded-[26px] sm:px-7 sm:py-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 right-5 font-display text-[180px] leading-none font-black text-lime/[0.035] select-none sm:text-[250px]"
      >
        M
      </div>

      <Logo
        size="lg"
        decorative
        className="relative z-[2] mb-2 sm:absolute sm:top-1/2 sm:right-6 sm:mb-0 sm:-translate-y-1/2 sm:opacity-95"
      />

      <div className="relative z-[3] max-w-2xl sm:pr-44">
        <p className="text-[10px] font-black tracking-[0.18em] text-lime uppercase sm:text-[11px]">
          Panel interactivo · iPad · móvil · ordenador
        </p>
        <h1 className="mt-1.5 font-display text-[clamp(1.75rem,5vw,3.4rem)] leading-[0.92] tracking-[-0.04em] text-ink uppercase sm:mt-2">
          Panel <span className="text-gold">de Gestión</span>
        </h1>
        <p className="mt-2 hidden max-w-xl text-sm leading-relaxed text-ink-muted sm:mt-3 sm:block">
          Gestiona reservas, pagos y avisos de tu comunidad. Diseñado para usarse con el dedo en
          iPad y móvil, además de ordenador.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
          <span className="rounded-full border border-line-olive bg-green-deep/80 px-2.5 py-1.5 text-[11px] text-ink-soft sm:px-3 sm:py-2 sm:text-xs">
            💶 <b className="text-lime">7 €</b> por clase
          </span>
          <span className="rounded-full border border-line-olive bg-green-deep/80 px-2.5 py-1.5 text-[11px] text-ink-soft sm:px-3 sm:py-2 sm:text-xs">
            📅 <b className="text-lime">Martes y jueves</b>
          </span>
        </div>
      </div>
    </section>
  )
}
