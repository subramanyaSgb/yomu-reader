// One screen per shelf: Reading / Want to Read / Completed. The whole app is these
// three grids over the curated catalog (src/catalog.ts) — no external discovery.

import { useEffect, useState } from 'react'
import { Search, X, CalendarClock } from 'lucide-react'
import { CATALOG, type CatalogEntry } from '../../catalog'
import { kkCoverUrl } from '../../lib/kakalot/client'
import { coverHue } from '../../components/CoverGradient'
import { getReadList } from '../reader/readTracking'
import { getSeriesMeta } from './seriesMeta'
import { getProgress } from '../../lib/db/repo'
import { useShelves, shelfOf, type Shelf } from './shelf'
import type { SeriesSource } from '../../App'

interface CardInfo { pct?: number; lastNumber?: string | null; at?: number }

const SHELF_TITLE: Record<Shelf, string> = {
  reading: 'Reading',
  want: 'Want to Read',
  completed: 'Completed',
}

const EMPTY_HINT: Record<Shelf, string> = {
  reading: 'Nothing in progress — open a series from Want to Read and it moves here.',
  want: 'Empty. Ask for new series to be added and they land here.',
  completed: 'Nothing finished yet — mark a series Completed from its page.',
}

function Card({ entry, info, onOpen }: { entry: CatalogEntry; info?: CardInfo; onOpen: (id: string, src: SeriesSource) => void }) {
  const hue = coverHue(entry.id || entry.title)
  const unavailable = entry.unavailable === true
  return (
    <button
      onClick={() => { if (!unavailable) onOpen(entry.id, 'kakalot') }}
      style={{ textAlign: 'left', background: 'none', border: 'none', cursor: unavailable ? 'default' : 'pointer', padding: 0, opacity: unavailable ? 0.45 : 1 }}>
      <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '110/152', position: 'relative',
        background: `linear-gradient(150deg, ${hue} 0%, color-mix(in oklab, ${hue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)` }}>
        {!unavailable && (
          <img src={entry.cover ?? kkCoverUrl(entry.id)} alt={entry.title} loading="lazy" decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {unavailable && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--y-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Not on source yet</span>
          </div>
        )}
        {/* read-% badge (bottom-left) + last-read chapter (bottom-right) */}
        {info?.pct != null && info.pct > 0 && (
          <span style={{ position: 'absolute', bottom: 6, left: 6, background: info.pct >= 100 ? 'var(--y-ok)' : 'rgba(0,0,0,0.7)', color: info.pct >= 100 ? 'var(--y-onp)' : '#fff', fontSize: 9.5, fontWeight: 800, borderRadius: 7, padding: '3px 6px' }}>
            {Math.min(100, info.pct)}%
          </span>
        )}
        {info?.lastNumber != null && (
          <span style={{ position: 'absolute', bottom: 6, right: 6, background: 'var(--y-aa)', color: 'var(--y-a)', fontSize: 9.5, fontWeight: 800, borderRadius: 7, padding: '3px 6px' }}>
            Ch. {info.lastNumber}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--y-text)', marginTop: 6, lineHeight: 1.3,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{entry.title}</div>
    </button>
  )
}

export default function ShelfScreen({
  shelf,
  onOpen,
  onUpcoming,
}: {
  shelf: Shelf
  onOpen: (id: string, source: SeriesSource) => void
  onUpcoming?: () => void
}) {
  const { shelves, loaded } = useShelves()
  const [term, setTerm] = useState('')
  const [info, setInfo] = useState<Record<string, CardInfo>>({})
  const q = term.trim().toLowerCase()

  // Local-only card info: read %, last chapter, recency (no network).
  useEffect(() => {
    let alive = true
    ;(async () => {
      const out: Record<string, CardInfo> = {}
      await Promise.all(CATALOG.filter(e => !e.unavailable).map(async e => {
        const sid = e.id
        const [reads, meta, prog] = await Promise.all([getReadList(sid), getSeriesMeta(sid), getProgress(sid)])
        out[sid] = {
          pct: meta?.total ? Math.round((reads.length / meta.total) * 100) : undefined,
          lastNumber: meta?.lastNumber ?? undefined,
          at: prog?.updatedAt,
        }
      }))
      if (alive) setInfo(out)
    })()
    return () => { alive = false }
  }, [shelf])

  const entries = CATALOG.filter(e =>
    shelfOf(shelves, e.id || e.title) === shelf &&
    (!q || e.title.toLowerCase().includes(q) || e.wcTitle.toLowerCase().includes(q)),
  )
  // Reading shelf: most recently read first.
  if (shelf === 'reading') {
    entries.sort((a, b) => (info[b.id]?.at ?? 0) - (info[a.id]?.at ?? 0))
  }

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%' }}>
      <header style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--y-hi)' }}>YOMU</span>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--y-a)', marginBottom: 2 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onUpcoming && (
            <button onClick={onUpcoming} aria-label="Upcoming chapters" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-mid)' }}>
              <CalendarClock size={20} />
            </button>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--y-dim)' }}>{entries.length} series</span>
        </div>
      </header>

      <h1 style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--y-hi)', padding: '4px 18px 14px' }}>
        {SHELF_TITLE[shelf]}
      </h1>

      {/* Filter within this shelf */}
      <div style={{ position: 'relative', height: 46, margin: '0 18px 14px' }}>
        <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--y-dim)' }} />
        <input
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder={`Search ${SHELF_TITLE[shelf]}`}
          style={{
            width: '100%', height: '100%', background: 'var(--y-surf)',
            border: '1px solid var(--y-line)', borderRadius: 13,
            paddingLeft: 38, paddingRight: term ? 44 : 13,
            fontSize: 13.5, fontWeight: 600, color: 'var(--y-hi)', outline: 'none',
          }}
        />
        {term && (
          <button onClick={() => setTerm('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26, borderRadius: '50%', background: 'var(--y-line)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--y-mid)' }}><X size={13} /></button>
        )}
      </div>

      {loaded && entries.length === 0 && (
        <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--y-dim)', padding: '24px 18px', textAlign: 'center', lineHeight: 1.6 }}>
          {q ? `No matches for “${term.trim()}” on this shelf.` : EMPTY_HINT[shelf]}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 12px', padding: '0 18px 24px' }}>
        {entries.map(e => <Card key={e.title} entry={e} info={info[e.id]} onOpen={onOpen} />)}
      </div>
    </div>
  )
}
