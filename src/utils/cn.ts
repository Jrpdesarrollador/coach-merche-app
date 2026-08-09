type ClassValue = string | false | null | undefined

/** Utilidad mínima para componer classNames sin dependencias extra. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
