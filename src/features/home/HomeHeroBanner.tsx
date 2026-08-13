/** Banner hero de Inicio — imagen del mockup del cliente (foto + copy de bienvenida). */
export const HOME_HERO_BANNER_SRC = '/assets/home/home-hero-banner.png'

export function HomeHeroBanner() {
  return (
    <div
      className="relative w-full overflow-hidden min-h-[180px] sm:min-h-[220px] lg:min-h-[260px]"
      aria-hidden
    >
      <img
        src={HOME_HERO_BANNER_SRC}
        alt=""
        width={211}
        height={225}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        className="absolute inset-0 h-[128%] w-full object-cover object-[center_62%] sm:object-[center_58%]"
      />
    </div>
  )
}
