/** Rutas del panel de gestión (Merche). Estilo alineado al preview `Control de Clases`. */
export const adminNavItems = [
  { to: '/gestion', label: 'Resumen', icon: '⌂', end: true as const },
  { to: '/gestion/clases', label: 'Clases', icon: '▦', end: false as const },
  { to: '/gestion/pagos', label: 'Pagos', icon: '€', end: false as const },
  { to: '/gestion/notificaciones', label: 'Avisos', icon: '🔔', end: false as const },
] as const

export type AdminNavItem = (typeof adminNavItems)[number]
