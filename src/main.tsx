import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/app/providers'
import App from './App'
import './index.css'

// Performance timing
console.log('[PERF] Main.tsx loaded at:', Date.now())

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            className: 'toast-custom',
            style: {
              background: 'var(--color-dark-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-dark-border)',
            },
            success: {
              iconTheme: {
                primary: 'var(--color-status-success)',
                secondary: 'var(--color-text-primary)',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--color-status-error)',
                secondary: 'var(--color-text-primary)',
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
