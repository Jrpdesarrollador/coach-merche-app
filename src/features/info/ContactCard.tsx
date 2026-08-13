import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface ContactCardProps {
  href: string
  label: string
  description: string
  icon: ReactNode
  external?: boolean
}

export function ContactCard({
  href,
  label,
  description,
  icon,
  external = true,
}: ContactCardProps) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={cn(
        'flex min-h-[4.5rem] items-center gap-4 rounded-xl border border-line-gold bg-[linear-gradient(135deg,rgba(214,175,86,0.08),rgba(174,212,25,0.05))] p-4',
        'transition-[border-color,transform] duration-150 active:scale-[0.98] hover:border-lime',
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line-gold bg-gold/10 text-gold">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-sm text-ink-muted">{description}</span>
      </span>
    </a>
  )
}
