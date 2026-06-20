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
    const theme = darkMode ? 'dark' : 'light'
    const root = document.documentElement

    root.dataset.theme = theme
    root.classList.toggle('dark', darkMode)
    document.body.dataset.theme = theme
    document.body.classList.toggle('dark', darkMode)
    root.style.colorScheme = theme

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    themeColor?.setAttribute('content', darkMode ? '#0f0f13' : '#f6f7fb')
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
          fontFamily: 'Nunito, Inter, sans-serif',
        },
      }}
    />
  </QueryClientProvider>,
)
