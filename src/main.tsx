import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './features/reliability/ErrorBoundary'

// Update prompt: when a new build is waiting, show a tap-to-update toast instead of
// requiring a manual hard refresh. Plain DOM so it works even if React failed.
const updateSW = registerSW({
  onNeedRefresh() {
    if (document.getElementById('yomu-update-toast')) return
    const toast = document.createElement('button')
    toast.id = 'yomu-update-toast'
    toast.textContent = 'New version ready — tap to update'
    Object.assign(toast.style, {
      position: 'fixed', left: '50%', bottom: '92px', transform: 'translateX(-50%)',
      zIndex: '9999', padding: '12px 18px', borderRadius: '22px', border: 'none',
      background: 'var(--y-p, #17B57E)', color: '#fff', fontSize: '13px', fontWeight: '700',
      boxShadow: '0 8px 24px rgba(0,0,0,0.45)', cursor: 'pointer',
    } as CSSStyleDeclaration)
    toast.onclick = () => { toast.disabled = true; toast.textContent = 'Updating…'; void updateSW(true) }
    document.body.appendChild(toast)
  },
})

// Aggressive caching is a survival requirement for the MangaDex client (see CLAUDE.md).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // metadata changes slowly
      gcTime: 30 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)
