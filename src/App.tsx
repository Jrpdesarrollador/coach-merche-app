import { ToastProvider } from '@/components/ui'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { AppRouter } from '@/routes'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
