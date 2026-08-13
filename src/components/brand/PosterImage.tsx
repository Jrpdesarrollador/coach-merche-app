import { useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

type PosterRatio = '9/16' | '2/3' | '4/5' | '1/1' | 'auto'

interface PosterImageProps {
  src: string
  alt: string
  /** Relacion de aspecto del cartel original, para reservar el hueco antes de cargar. */
  ratio?: PosterRatio
  /** `contain` para ver el cartel entero, `cover` para tarjetas y listados. */
  fit?: 'contain' | 'cover'
  priority?: boolean
  className?: string
  imageClassName?: string
}

const ratioClasses: Record<Exclude<PosterRatio, 'auto'>, string> = {
  '9/16': 'aspect-[9/16]',
  '2/3': 'aspect-[2/3]',
  '4/5': 'aspect-[4/5]',
  '1/1': 'aspect-square',
}

export function PosterImage({
  src,
  alt,
  ratio = '4/5',
  fit = 'cover',
  priority = false,
  className,
  imageClassName,
}: PosterImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (imageRef.current?.complete) setLoaded(true)
  }, [])

  const isAuto = ratio === 'auto'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-line bg-bg-secondary',
        !isAuto && ratioClasses[ratio],
        className,
      )}
    >
      {!loaded && !isAuto && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,var(--background-secondary)_0%,var(--surface-elevated)_45%,var(--background-secondary)_90%)] bg-[length:200%_100%]"
        />
      )}
      {!loaded && isAuto && (
        <span
          aria-hidden="true"
          className="block h-48 w-full animate-shimmer bg-[linear-gradient(90deg,var(--background-secondary)_0%,var(--surface-elevated)_45%,var(--background-secondary)_90%)] bg-[length:200%_100%]"
        />
      )}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          'relative transition-opacity duration-300',
          isAuto ? 'block h-auto w-full' : 'size-full',
          fit === 'cover' ? 'object-cover' : 'object-contain',
          loaded ? 'opacity-100' : 'opacity-0',
          imageClassName,
        )}
      />
    </div>
  )
}
