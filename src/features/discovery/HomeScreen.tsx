// Home = the owner's curated catalog (src/catalog.ts). No external discovery rails —
// this is a personal library app: only the listed series exist in the UI.

import { Bell, Search as SearchIcon } from 'lucide-react'
import { CATALOG, type CatalogEntry } from '../../catalog'
import { kkCoverUrl } from '../../lib/kakalot/client'
import { coverHue } from '../../components/CoverGradient'
import type { SeriesSource } from '../../App'

function CatalogCard({ entry, onOpen }: { entry: CatalogEntry; onOpen: (id: string, src: SeriesSource) => void }) {
  const hue = coverHue(entry.id || entry.title)
  const unavailable = entry.unavailable === true
  return (
    <button
      onClick={() => { if (!unavailable) onOpen(entry.id, 'kakalot') }}
      style={{ textAlign: 'left', background: 'none', border: 'none', cursor: unavailable ? 'default' : 'pointer', padding: 0, opacity: unavailable ? 0.45 : 1 }}>
      <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '110/152', position: 'relative',
        background: `linear-gradient(150deg, ${hue} 0%, color-mix(in oklab, ${hue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)` }}>
        {!unavailable && (
          <img src={kkCoverUrl(entry.id)} alt={entry.title} loading="lazy" decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {unavailable && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--y-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Not on source yet</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--y-text)', marginTop: 6, lineHeight: 1.3,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{entry.title}</div>
    </button>
  )
}

export default function HomeScreen({
  onOpen,
  onUnread,
}: {
  onOpen: (id: string, source: SeriesSource) => void
  onUnread: () => void
}) {
  const hero = CATALOG[0]
  const heroHue = coverHue(hero.id)
  const available = CATALOG.filter(e => !e.unavailable).length

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%' }}>
      {/* Header 58px */}
      <header style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--y-hi)' }}>YOMU</span>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--y-a)', marginBottom: 2 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={onUnread} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-mid)' }}>
            <Bell size={20} />
          </button>
          <button style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-mid)' }}>
            <SearchIcon size={20} />
          </button>
          <button style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(140deg, var(--y-p), var(--y-a))', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--y-onp)', fontSize: 14, fontWeight: 700 }}>
            Y
          </button>
        </div>
      </header>

      {/* Hero — first series of the curated list */}
      <div style={{ height: 268, position: 'relative', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(150deg, ${heroHue} 0%, color-mix(in oklab, ${heroHue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)` }} />
        <img src={kkCoverUrl(hero.id)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--y-bg) 3%, var(--y-ov) 40%, transparent 76%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 18, right: 18, paddingBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <span style={{ background: 'var(--y-aa)', color: 'var(--y-a)', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', borderRadius: 6, padding: '3px 7px', textTransform: 'uppercase' }}>My Library</span>
            <span style={{ background: 'var(--y-ov2)', color: 'var(--y-mid)', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', borderRadius: 6, padding: '3px 7px', textTransform: 'uppercase' }}>Manhwa · EN</span>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--y-hi)', marginBottom: 6, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{hero.title}</h2>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--y-mid)', marginBottom: 14 }}>{available} series in your library</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => onOpen(hero.id, 'kakalot')} style={{
              height: 46, flex: 1.2, borderRadius: 13, background: 'var(--y-p)', color: 'var(--y-onp)',
              fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 13 }}>▶</span> Read now
            </button>
            <button onClick={() => onOpen(hero.id, 'kakalot')} style={{
              height: 46, flex: 1, borderRadius: 13, background: 'transparent',
              border: '1.5px solid var(--y-line)', color: 'var(--y-hi)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>Details</button>
          </div>
        </div>
      </div>

      {/* Full catalog grid */}
      <div style={{ padding: '0 18px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--y-hi)' }}>My Library</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--y-dim)' }}>{CATALOG.length} titles</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 12px', padding: '6px 18px 24px' }}>
        {CATALOG.map(e => <CatalogCard key={e.title} entry={e} onOpen={onOpen} />)}
      </div>

      <p style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', textAlign: 'center', padding: '0 18px 24px', lineHeight: 1.55 }}>
        Curated personal library · long-strip reading · Personal-use client.
      </p>
    </div>
  )
}
