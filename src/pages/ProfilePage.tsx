import { UserIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import { EmptyState } from '@/components/ui'

export function ProfilePage() {
  return (
    <>
      <TopBar title="Perfil" />
      <section className="flex flex-col gap-4 pt-2">
        <EmptyState
          title="Perfil disponible tras iniciar sesión"
          description="El acceso con cuenta llegará en la siguiente fase."
          icon={<UserIcon width={28} height={28} />}
        />
      </section>
    </>
  )
}
