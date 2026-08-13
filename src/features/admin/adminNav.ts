/** Rutas del panel de gestión — agrupadas por área para Merche. */
export const adminNavGroups = [
  {
    id: 'dia-a-dia',
    label: 'Día a día',
    items: [
      { to: '/gestion', label: 'Inicio', icon: '⌂', end: true as const },
      { to: '/gestion/registrar', label: 'Registrar', icon: '✓', end: false as const },
      { to: '/gestion/usuarios', label: 'Alumnas', icon: '👥', end: false as const },
      { to: '/gestion/pagos', label: 'Pagos', icon: '€', end: false as const },
    ],
  },
  {
    id: 'planificacion',
    label: 'Planificación',
    items: [
      { to: '/gestion/clases', label: 'Clases', icon: '▦', end: false as const },
      { to: '/gestion/entrenos', label: 'Entrenamientos', icon: '🏋️', end: false as const },
      { to: '/gestion/historial', label: 'Historial', icon: '☷', end: false as const },
    ],
  },
  {
    id: 'comunidad',
    label: 'Comunidad',
    items: [
      { to: '/gestion/publicaciones', label: 'Posts', icon: '📝', end: false as const },
      { to: '/gestion/chat', label: 'Chat', icon: '💬', end: false as const },
      { to: '/gestion/notificaciones', label: 'Avisos', icon: '🔔', end: false as const },
      { to: '/gestion/recompensas', label: 'Recompensas', icon: '🏆', end: false as const },
    ],
  },
  {
    id: 'mas',
    label: 'Más opciones',
    items: [
      { to: '/gestion/informes', label: 'Informes', icon: '📊', end: false as const },
      { to: '/gestion/configuracion', label: 'Ajustes', icon: '⚙', end: false as const },
    ],
  },
] as const

export type AdminNavItem = (typeof adminNavGroups)[number]['items'][number]

export const adminNavItems: AdminNavItem[] = adminNavGroups.flatMap((group) => [...group.items])

/** Accesos principales en la barra inferior móvil (máx. 5). */
export const adminMobilePrimaryNav: AdminNavItem[] = [
  { to: '/gestion', label: 'Inicio', icon: '⌂', end: true },
  { to: '/gestion/registrar', label: 'Registrar', icon: '✓', end: false },
  { to: '/gestion/usuarios', label: 'Alumnas', icon: '👥', end: false },
  { to: '/gestion/pagos', label: 'Pagos', icon: '€', end: false },
  { to: '/gestion/clases', label: 'Clases', icon: '▦', end: false },
]

/** Resto de rutas accesibles desde "Más" en móvil. */
export const adminMobileMoreNav: AdminNavItem[] = adminNavItems.filter(
  (item) => !adminMobilePrimaryNav.some((primary) => primary.to === item.to),
)
