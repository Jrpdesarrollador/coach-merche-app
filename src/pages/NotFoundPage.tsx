import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="flex flex-1 flex-col items-start justify-center gap-4 py-8">
      <h1 className="text-3xl text-[var(--text-primary)]">Página no encontrada</h1>
      <p className="text-[var(--text-secondary)]">
        Esta ruta aún no forma parte de Coach Merche App.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-[var(--radius-md)] bg-[var(--brand-lime)] px-4 py-3 font-medium text-[var(--brand-black)] transition-[transform,opacity] duration-[var(--transition-fast)] active:scale-[0.98]"
      >
        Volver al inicio
      </Link>
    </section>
  )
}
