import { ToastProvider } from '@/components/ui'
import { AppRouter } from '@/routes'

function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  )
}

export default App
