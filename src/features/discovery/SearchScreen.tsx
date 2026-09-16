// Search = instant client-side filter over the curated catalog (src/catalog.ts).
// No network calls — the app only contains the owner's listed series.

import { useEffect, useRef, useState } from 'react'
import { Search, X, Clock } from 'lucide-react'
import { CATALOG } from '../../catalog'
import { kkCoverUrl } from '../../lib/kakalot/client'
import { getSetting, setSetting } from '../../lib/db/repo'
import { coverHue } from '../../components/CoverGradient'
import type { SeriesSource } from '../../App'

const RECENT_KEY = 'search:recent'

export default function SearchScreen({ onOpen }: { onOpen: (id: string, source: SeriesSource) => void }) {
  const [term, setTerm] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSetting<string[]>(RECENT_KEY).then(r => setRecent(r ?? []))
  }, [])

  function remember(q: string) {
    if (!q) return
    const next = [q, ...recent.filter(r => r !== q)].slice(0, 8)
    setRecent(next); void setSetting(RECENT_KEY, next)
  }
  function clearRecent() { setRecent([]); void setSetting(RECENT_KEY, []) }

  const q = term.trim().toLowerCase()
  const results = q
    ? CATALOG.filter(e => e.title.toLowerCase().includes(q) || e.wcTitle.toLowerCase().includes(q))
    : CATALOG
  const hasQuery = q.length > 0

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%', paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--y-hi)' }}>Search</h1>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--y-dim)' }}>{CATALOG.length} titles</span>
        </div>

        {/* Search field */}
        <div style={{ position: 'relative', height: 50, marginBottom: 12 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--y-dim)' }} />
          <input
            ref={inputRef}
            value={term}
            onChange={e => setTerm(e.target.value)}
            onBlur={() => remember(term.trim())}
            placeholder="Search my library"
            style={{
              width: '100%', height: '100%', background: 'var(--y-surf)',
              border: '1px solid var(--y-line)', borderRadius: 14,
              paddingLeft: 42, paddingRight: term ? 48 : 14,
              fontSize: 14, fontWeight: 600, color: 'var(--y-hi)', outline: 'none',
            }}
          />
          {term && (
            <button onClick={() => setTerm('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: 'var(--y-line)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--y-mid)' }}><X size={14} /></button>
          )}
        </div>
      </div>

      {/* Results count */}
      {hasQuery && (
        <div style={{ padding: '0 18px 12px', fontSize: 12, fontWeight: 600, color: 'var(--y-dim)' }}>{results.length} results</div>
      )}

      {/* Results grid */}
      <div style={{ padding: '0 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
        {results.map(e => {
          const hue = coverHue(e.id || e.title)
          const unavailable = e.unavailable === true
          return (
            <button key={e.title}
              onClick={() => { if (!unavailable) { remember(term.trim()); onOpen(e.id, 'kakalot') } }}
              style={{ textAlign: 'left', background: 'none', border: 'none', cursor: unavailable ? 'default' : 'pointer', padding: 0, opacity: unavailable ? 0.45 : 1 }}>
              <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '110/152', position: 'relative',
                background: `linear-gradient(150deg, ${hue} 0%, color-mix(in oklab, ${hue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)` }}>
                {!unavailable && <img src={kkCoverUrl(e.id)} alt={e.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                {unavailable && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--y-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Not on source yet</span>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--y-hi)', marginTop: 6, lineHeight: 1.3,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{e.title}</div>
            </button>
          )
        })}
      </div>

      {/* Recents (below grid when idle) */}
      {!hasQuery && recent.length > 0 && (
        <div style={{ padding: '18px 18px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--y-dim)' }}>Recent searches</span>
            <button onClick={clearRecent} style={{ fontSize: 11, fontWeight: 700, color: 'var(--y-a)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
          </div>
          {recent.map(r => (
            <button key={r} onClick={() => setTerm(r)} style={{
              width: '100%', height: 48, display: 'flex', alignItems: 'center', gap: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              borderTop: '1px solid var(--y-line2)', padding: '0 4px',
            }}>
              <Clock size={16} style={{ color: 'var(--y-dim)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--y-text)', flex: 1, textAlign: 'left' }}>{r}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
