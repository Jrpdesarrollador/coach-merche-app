import { useState } from 'react'
import { Button } from '@/components/ui'

interface WorkoutVideoPlayerProps {
  src: string
  poster: string | null
  title: string
}

export function WorkoutVideoPlayer({ src, poster, title }: WorkoutVideoPlayerProps) {
  const [playbackFailed, setPlaybackFailed] = useState(false)

  if (playbackFailed) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-black px-6 text-center">
        <p className="text-sm text-white">No hemos podido reproducir este vídeo.</p>
        <Button variant="secondary" size="sm" onClick={() => setPlaybackFailed(false)}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <video
      controls
      playsInline
      preload="metadata"
      poster={poster ?? undefined}
      className="aspect-video w-full bg-black object-contain"
      src={src}
      aria-label={`Vídeo del entrenamiento ${title}`}
      onError={() => setPlaybackFailed(true)}
    >
      Tu navegador no soporta vídeo HTML5.
    </video>
  )
}
