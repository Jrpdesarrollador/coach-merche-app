/** Rutas del panel de gestión — agrupadas por área. */
export const adminNavGroups = [
  {
    id: 'admin',
    label: 'Admin',
    items: [
      { to: '/gestion', label: 'Resumen', icon: '⌂', end: true as const },
      { to: '/gestion/registrar', label: 'Registrar', icon: '＋', end: false as const },
      { to: '/gestion/usuarios', label: 'Usuarios', icon: '👥', end: false as const },
      { to: '/gestion/historial', label: 'Historial', icon: '☷', end: false as const },
      { to: '/gestion/recompensas', label: 'Recompensas', icon: '🏆', end: false as const },
      { to: '/gestion/pagos', label: 'Pagos', icon: '€', end: false as const },
      { to: '/gestion/configuracion', label: 'Ajustes', icon: '⚙', end: false as const },
      { to: '/gestion/informes', label: 'Informes', icon: '📊', end: false as const },
    ],
  },
  {
    id: 'contenido',
    label: 'Contenido',
    items: [
      { to: '/gestion/clases', label: 'Clases', icon: '▦', end: false as const },
      { to: '/gestion/entrenos', label: 'Entrenos', icon: '🏋️', end: false as const },
      { to: '/gestion/publicaciones', label: 'Posts', icon: '📝', end: false as const },
    ],
  },
  {
    id: 'comunicacion',
    label: 'Comunicación',
    items: [
      { to: '/gestion/notificaciones', label: 'Avisos', icon: '🔔', end: false as const },
      { to: '/gestion/chat', label: 'Chat', icon: '💬', end: false as const },
    ],
  },
] as const

export type AdminNavItem = (typeof adminNavGroups)[number]['items'][number]

export const adminNavItems: AdminNavItem[] = adminNavGroups.flatMap((group) => [...group.items])
