import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { adminMobileMoreNav, adminNavGroups } from '../adminNav'

interface AdminMoreSheetProps {
  open: boolean
  onClose: () => void
}

/** Panel "Más" con el resto de secciones del panel (móvil). */
export function AdminMoreSheet({ open, onClose }: AdminMoreSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const moreByGroup = adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        adminMobileMoreNav.some((more) => more.to === item.to),
      ),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar menú"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm sm:hidden"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Más secciones"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-[22px] border border-line bg-bg-primary px-4 pt-4 pb-[calc(5.5rem+var(--safe-bottom))] shadow-premium sm:hidden"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-lg text-ink">Más secciones</p>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line text-lg text-ink-muted"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {moreByGroup.map((group) => (
            <div key={group.id}>
              <p className="mb-2 text-[10px] font-black tracking-[0.14em] text-ink-muted uppercase">
                {group.label}
              </p>
              <ul className="flex flex-col gap-1">
                {group.items.map(({ to, label, icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors',
                          isActive
                            ? 'border-lime bg-lime/10 text-lime'
                            : 'border-line bg-surface text-ink-soft hover:border-line-lime',
                        )
                      }
                    >
                      <span className="text-base" aria-hidden>
                        {icon}
                      </span>
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
