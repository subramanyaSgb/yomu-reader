// Reading history: newest-first log of chapters opened, grouped by day.

import { useEffect, useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { getHistory, clearHistory, type HistoryEntry } from './history'
import type { SeriesSource } from '../../App'

function dayLabel(t: number): string {
  const d = new Date(t)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yest = new Date(today.getTime() - 86_400_000)
  if (d >= today) return 'Today'
  if (d >= yest) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function HistoryScreen({
  onBack,
  onOpen,
}: {
  onBack: () => void
  onOpen: (id: string, source: SeriesSource) => void
}) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)
  useEffect(() => { getHistory().then(l => setEntries([...l].reverse())) }, [])

  let lastDay = ''
  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%', paddingBottom: 24 }}>
      <header style={{ height: 58, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px' }}>
        <button onClick={onBack} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-hi)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--y-hi)', flex: 1 }}>Reading history</h1>
        {entries != null && entries.length > 0 && (
          <button onClick={() => { void clearHistory(); setEntries([]) }} aria-label="Clear history" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-dim)' }}>
            <Trash2 size={18} />
          </button>
        )}
      </header>

      {entries != null && entries.length === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--y-dim)', textAlign: 'center', padding: '30px 18px' }}>
          Nothing yet — chapters you open show up here.
        </p>
      )}

      {(entries ?? []).map(e => {
        const day = dayLabel(e.at)
        const showDay = day !== lastDay
        lastDay = day
        return (
          <div key={`${e.chapterId}:${e.at}`}>
            {showDay && (
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--y-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '16px 18px 6px' }}>{day}</div>
            )}
            <button onClick={() => onOpen(e.seriesId, 'kakalot')} style={{
              width: '100%', minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
              borderTop: '1px solid var(--y-line2)', textAlign: 'left',
            }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--y-hi)' }}>{e.title}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--y-dim)', marginTop: 2 }}>Chapter {e.number ?? '?'}</div>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--y-dim)' }}>
                {new Date(e.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
