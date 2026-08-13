import { ToastProvider } from '@/components/ui'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { SplashIntro } from '@/features/splash/SplashIntro'
import { useSplashIntro } from '@/features/splash/useSplashIntro'
import { AppRouter } from '@/routes'

function App() {
  const { visible: showIntro, complete: completeIntro } = useSplashIntro()

  return (
    <ToastProvider>
      <AuthProvider>
        <AppRouter />
        {showIntro && <SplashIntro onComplete={completeIntro} />}
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
