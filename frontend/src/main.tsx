import ReactDOM from 'react-dom/client'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'
import { useUiStore } from '@/store/uiStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function ThemeSync() {
  const darkMode = useUiStore(s => s.darkMode)

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      darkMode ? 'dark' : 'light'
    )
  }, [darkMode])

  return null
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeSync />
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--bg3)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          fontSize: '13px',
          fontFamily: 'DM Sans, sans-serif',
        },
      }}
    />
  </QueryClientProvider>,
)