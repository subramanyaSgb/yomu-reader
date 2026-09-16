import { useEffect, useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { getLibrary } from './libraryRepo'
import {
  SHELVES, sortComparator, onShelf, unreadCount,
  type LibraryEntry, type Shelf, type SortKey,
} from './libraryLogic'
import { coverHue } from '../../components/CoverGradient'
import type { SeriesSource } from '../../App'

const SHELF_LABELS: Record<string, string> = {
  reading: 'Reading', completed: 'Completed', 'on-hold': 'On Hold',
  dropped: 'Dropped', 'plan-to-read': 'Plan to Read',
}
const SORT_LABELS: Record<SortKey, string> = {
  recent: 'Recently read', az: 'A–Z', updated: 'Last updated',
}
const ALL_SHELVES = ['all', ...SHELVES] as const
type AllShelf = typeof ALL_SHELVES[number]

export default function LibraryScreen({ onOpen }: { onOpen: (id: string, source?: SeriesSource) => void }) {
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [shelf, setShelf] = useState<AllShelf>('reading')
  const [sort, setSort] = useState<SortKey>('recent')
  const [dupDismissed, setDupDismissed] = useState(false)
  const [contextEntry, setContextEntry] = useState<LibraryEntry | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null)

  useEffect(() => { getLibrary().then(setEntries) }, [])

  const filtered = shelf === 'all' ? entries : onShelf(entries, shelf as Shelf)
  const shown = [...filtered].sort(sortComparator(sort))

  function cycleSort() {
    const keys: SortKey[] = ['recent', 'az', 'updated']
    setSort(k => keys[(keys.indexOf(k) + 1) % keys.length])
  }

  const shelfCounts = Object.fromEntries(
    ALL_SHELVES.map(s => [s, s === 'all' ? entries.length : onShelf(entries, s as Shelf).length])
  )

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%', paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 0' }}>
        <h1 style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--y-hi)' }}>Library</h1>
        <button onClick={cycleSort} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 12px', borderRadius: 11, background: 'var(--y-surf)', border: '1px solid var(--y-line)', cursor: 'pointer', color: 'var(--y-mid)', fontSize: 11.5, fontWeight: 700 }}>
          <ArrowUpDown size={14} /> {SORT_LABELS[sort]}
        </button>
      </div>

      {/* Shelf tabs */}
      <div className="hide-scrollbar" style={{ display: 'flex', gap: 16, padding: '10px 18px', overflowX: 'auto', borderBottom: '1px solid var(--y-line)', marginBottom: 14 }}>
        {ALL_SHELVES.map(s => {
          const active = shelf === s
          const label = s === 'all' ? 'All' : SHELF_LABELS[s]
          const count = shelfCounts[s]
          return (
            <button key={s} onClick={() => setShelf(s)} style={{
              flexShrink: 0, paddingBottom: 10, background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, color: active ? 'var(--y-hi)' : 'var(--y-dim)',
              borderBottom: active ? '2px solid var(--y-a)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {label}
              <span style={{ fontSize: 10.5, fontWeight: 600, color: active ? 'var(--y-a)' : 'var(--y-dim)' }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Dup warning */}
      {!dupDismissed && entries.length > 0 && (
        <div style={{ margin: '0 18px 14px', background: 'var(--y-aa)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--y-a)' }}>
            Tip: long-press a cover for shelf, download, and notification options.
          </span>
          <button onClick={() => setDupDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-a)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      <div style={{ padding: '0 18px 4px', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--y-dim)', marginBottom: 10 }}>
        Long-press a cover for options
      </div>

      {shown.length === 0 && (
        <p style={{ padding: '24px 18px', fontSize: 13, fontWeight: 600, color: 'var(--y-dim)' }}>Nothing here yet — browse and add series.</p>
      )}

      {/* 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 14px', padding: '0 18px' }}>
        {shown.map(e => {
          const hue = coverHue(e.seriesId)
          const pct = e.totalChapters > 0 ? Math.round(100 * e.readChapters / e.totalChapters) : 0
          const uc = unreadCount(e)
          return (
            <button
              key={e.seriesId}
              onClick={() => onOpen(e.seriesId)}
              onContextMenu={ev => { ev.preventDefault(); setContextEntry(e) }}
              onPointerDown={() => { const t = window.setTimeout(() => setContextEntry(e), 420); setLongPressTimer(t) }}
              onPointerUp={() => { if (longPressTimer) { window.clearTimeout(longPressTimer); setLongPressTimer(null) } }}
              onPointerLeave={() => { if (longPressTimer) { window.clearTimeout(longPressTimer); setLongPressTimer(null) } }}
              style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {/* Cover */}
              <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '110/152', position: 'relative',
                background: `linear-gradient(150deg, ${hue} 0%, color-mix(in oklab, ${hue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)` }}>
                {/* Shelf chip top-left */}
                <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 8.5, fontWeight: 700, borderRadius: 5, padding: '2px 6px', textTransform: 'capitalize' }}>
                  {SHELF_LABELS[e.shelf]}
                </span>
                {/* Unread badge top-right */}
                {uc > 0 && (
                  <span style={{ position: 'absolute', top: 8, right: 8, background: 'var(--y-a)', color: 'var(--y-onp)', fontSize: 9, fontWeight: 800, borderRadius: 6, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{uc}</span>
                )}
                {/* Bottom progress */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 8px 8px', background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                    Ch {e.readChapters} of {e.totalChapters}
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--y-p)', borderRadius: 2 }} />
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--y-hi)', marginTop: 6, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{e.title}</div>
            </button>
          )
        })}
      </div>

      {/* Context menu */}
      {contextEntry && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }} onClick={() => setContextEntry(null)}>
          <div style={{ margin: '0 24px', width: '100%', maxWidth: 390 - 48, background: 'var(--y-surf)', borderRadius: 18, border: '1px solid var(--y-line)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 16px 10px', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--y-dim)', borderBottom: '1px solid var(--y-line2)' }}>{contextEntry.title}</div>
            {[
              { label: 'Mark as complete', icon: '✓' },
              { label: 'Download all English ch.', icon: '↓' },
              { label: 'Move to shelf…', icon: '▤' },
              { label: 'Notify me of new ch.', icon: '🔔' },
              { label: 'Remove from library', icon: '✕', danger: true },
            ].map(item => (
              <button key={item.label} onClick={() => setContextEntry(null)} style={{
                width: '100%', height: 48, display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: 13.5, fontWeight: 700, color: item.danger ? 'var(--y-a)' : 'var(--y-hi)',
                borderTop: '1px solid var(--y-line2)',
              }}>
                <span style={{ fontSize: 17, width: 20, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
