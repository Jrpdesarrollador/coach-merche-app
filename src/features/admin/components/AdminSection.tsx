import type { ReactNode } from 'react'

interface AdminSectionProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

/** Bloque de contenido con cabecera (preview: `.section` + `.sectionHead`). */
export function AdminSection({ title, description, actions, children }: AdminSectionProps) {
  return (
    <section className="mt-3 rounded-[20px] border border-line bg-surface/95 p-4 sm:p-5">
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg tracking-[0.04em] text-ink uppercase">{title}</h2>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

/** Nota informativa con borde lima (preview: `.note`). */
export function AdminNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-r-[11px] border-l-[3px] border-l-lime bg-green-deep/50 px-3.5 py-3 text-xs leading-relaxed text-ink-muted">
      {children}
    </p>
  )
}
