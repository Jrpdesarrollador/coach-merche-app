import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base: IconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.2 12 3.5l9 6.7V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

export function DumbbellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
    </svg>
  )
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 5.5H5.5a2.5 2.5 0 0 0 2.5 2.5M16 5.5h2.5A2.5 2.5 0 0 1 16 8" />
      <path d="M12 13v4M9 20h6M10 17h4" />
    </svg>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4.5 21 20H3z" />
      <path d="M12 10v4.5M12 17.2h.01" />
    </svg>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function PinIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s6.5-5.7 6.5-10.3A6.5 6.5 0 0 0 5.5 10.7C5.5 15.3 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.4" />
    </svg>
  )
}

export function NewspaperIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 5.5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1z" />
      <path d="M7 9.5h10M7 13h6M7 16.5h8" />
    </svg>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4.5a4.5 4.5 0 0 0-4.5 4.5v2.8L5.5 15.5h13L16.5 11.8V9a4.5 4.5 0 0 0-4.5-4.5z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function LayoutGridIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  )
}

export function CreditCardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <path d="M3 10.5h18M7 15h3" />
    </svg>
  )
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3 20.5a6 6 0 0 1 12 0" />
      <circle cx="17.5" cy="9.5" r="2.5" />
      <path d="M15 20.5a4.5 4.5 0 0 1 7 0" />
    </svg>
  )
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="m3 8 9 6 9-6" />
    </svg>
  )
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.8-1.1A8.5 8.5 0 1 0 12 3z" />
      <path d="M9.2 9.8c.2-.5.4-.5.7-.5h.6c.2 0 .4 0 .5.3l.8 1.9c.1.2 0 .4-.1.5l-.5.6c-.1.2-.1.3 0 .5.4.8 1.1 1.5 1.9 1.9.2.1.3.1.5 0l.6-.5c.2-.1.3-.1.5.1l1.9.8c.2.1.3.3.3.5v.6c0 .3-.1.5-.5.7-.4.2-1 .4-1.7.4-1.2 0-2.6-.5-4-1.9-1.4-1.4-1.9-2.8-1.9-4 0-.7.2-1.3.4-1.7z" />
    </svg>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 10.5V16" />
      <path d="M12 8h.01" />
    </svg>
  )
}
