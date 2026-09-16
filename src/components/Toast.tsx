import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

interface ToastCtx { show: (msg: string) => void }
const Ctx = createContext<ToastCtx>({ show: () => {} })

export function useToast() { return useContext(Ctx) }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number>(undefined)

  const show = useCallback((m: string) => {
    setMsg(m)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 2000)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {msg && (
        <div
          style={{
            position: 'fixed', bottom: 94, left: 20, right: 20, zIndex: 100,
            background: 'var(--y-hi)', color: 'var(--y-bg)',
            borderRadius: 12, padding: '13px 16px',
            fontSize: 12.5, fontWeight: 700,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          {msg}
        </div>
      )}
    </Ctx.Provider>
  )
}
