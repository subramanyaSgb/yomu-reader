import { useEffect } from 'react'

interface SheetProps {
  onClose: () => void
  children: React.ReactNode
  maxHeight?: string
}

export default function Sheet({ onClose, children, maxHeight = '620px' }: SheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-panel absolute bottom-0 left-0 right-0 rounded-t-[20px] overflow-hidden"
        style={{ background: 'var(--y-surf)', border: '1px solid var(--y-line)', maxHeight }}
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--y-line)' }} />
        </div>
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--y-line)' }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--y-hi)' }}>{title}</div>
        {sub && <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--y-mid)', marginTop: 2 }}>{sub}</div>}
      </div>
      <button onClick={onClose} style={{ color: 'var(--y-mid)', fontSize: 20, lineHeight: 1, minWidth: 40, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  )
}
