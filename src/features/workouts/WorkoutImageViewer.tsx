import { useEffect, useState } from 'react'
import { PosterImage } from '@/components/brand'
import { Modal } from '@/components/ui'

interface WorkoutImageViewerProps {
  src: string
  title: string
  className?: string
  ratio?: '9/16' | '2/3' | '4/5' | '1/1' | 'auto'
  openByDefault?: boolean
}

export function WorkoutImageViewer({
  src,
  title,
  className,
  ratio = '4/5',
  openByDefault = false,
}: WorkoutImageViewerProps) {
  const [open, setOpen] = useState(openByDefault)

  useEffect(() => {
    if (openByDefault) setOpen(true)
  }, [openByDefault])

  return (
    <>
      <button
        type="button"
        className={`group relative block w-full text-left ${className ?? ''}`}
        onClick={() => setOpen(true)}
        aria-label={`Abrir en grande el entrenamiento ${title}`}
      >
        <PosterImage
          src={src}
          alt={title}
          ratio={ratio}
          fit="contain"
          className="w-full"
        />
        <span className="absolute right-3 bottom-3 rounded-full border border-white/20 bg-black/75 px-3 py-1.5 text-xs font-semibold text-white shadow-soft transition-colors group-hover:bg-black">
          Ver en grande
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={title} size="wide">
        <img
          src={src}
          alt={title}
          className="mx-auto max-h-[74svh] w-full rounded-lg bg-black object-contain"
        />
      </Modal>
    </>
  )
}
