import './home-hero.css'

/** Banner hero de Inicio — imagen del mockup del cliente (foto + copy de bienvenida). */
export const HOME_HERO_BANNER_SRC = '/assets/home/home-hero-banner.png'

const HERO_IMAGE = {
  src: HOME_HERO_BANNER_SRC,
  alt: '',
  width: 211,
  height: 225,
  loading: 'eager' as const,
  decoding: 'async' as const,
  fetchPriority: 'high' as const,
}

export function HomeHeroBanner() {
  return (
    <div className="home-hero-banner" aria-hidden>
      <img {...HERO_IMAGE} className="home-hero-banner__img" />
      <img {...HERO_IMAGE} aria-hidden className="home-hero-banner__img home-hero-banner__neon" />
    </div>
  )
}
