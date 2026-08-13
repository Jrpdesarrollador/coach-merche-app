import { useId, useState } from 'react'
import { ChevronRightIcon } from '@/components/icons'
import { cn } from '@/utils/cn'

interface FaqItem {
  question: string
  answer: string
}

interface FaqAccordionProps {
  items: readonly FaqItem[]
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const baseId = useId()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function toggle(index: number) {
    setOpenIndex((current) => (current === index ? null : index))
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => {
        const isOpen = openIndex === index
        const panelId = `${baseId}-panel-${index}`
        const buttonId = `${baseId}-button-${index}`

        return (
          <li key={item.question}>
            <div
              className={cn(
                'overflow-hidden rounded-xl border bg-surface transition-colors duration-200',
                isOpen ? 'border-line-lime shadow-soft' : 'border-line',
              )}
            >
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center gap-3 px-4 py-4 text-left"
                onClick={() => toggle(index)}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                    isOpen
                      ? 'border-lime bg-lime/10 text-lime'
                      : 'border-line-lime bg-lime/5 text-lime',
                  )}
                >
                  ?
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{item.question}</span>
                <ChevronRightIcon
                  width={18}
                  height={18}
                  className={cn(
                    'shrink-0 text-ink-muted transition-transform duration-200',
                    isOpen && 'rotate-90 text-lime',
                  )}
                />
              </button>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={cn(
                  'grid transition-[grid-template-rows] duration-200 ease-out',
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <div className="overflow-hidden">
                  <p className="border-t border-line px-4 pt-3 pb-4 text-sm leading-relaxed text-ink-soft">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
