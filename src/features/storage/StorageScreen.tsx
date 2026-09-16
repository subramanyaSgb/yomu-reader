import { useEffect, useState } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'

interface DownloadGroup { seriesId: string; title: string; chapters: number; sizeMb: number; expanded: boolean }

export default function StorageScreen() {
  const [isPersisted, setIsPersisted] = useState(false)
  const [groups, setGroups] = useState<DownloadGroup[]>([])

  useEffect(() => {
    navigator.storage?.persisted?.().then(p => setIsPersisted(!!p))
    // In a real app we'd load from db.downloads; for now show placeholder
    setGroups([])
  }, [])

  function toggleGroup(id: string) {
    setGroups(gs => gs.map(g => g.seriesId === id ? { ...g, expanded: !g.expanded } : g))
  }

  const downloadMb = groups.reduce((s, g) => s + g.sizeMb, 0)
  const cacheMb = 0 // evictable cache not tracked per-series in this build

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%', paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 0', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--y-hi)' }}>Storage</h1>
        {isPersisted && (
          <span style={{ background: 'var(--y-pa)', color: 'var(--y-ok)', fontSize: 9.5, fontWeight: 800, borderRadius: 8, padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '0.06em', border: '1px solid var(--y-ok)' }}>
            Persisted
          </span>
        )}
      </div>

      {/* Storage card */}
      <div style={{ margin: '0 18px 24px', background: 'var(--y-surf)', border: '1px solid var(--y-line)', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--y-mid)', marginBottom: 6 }}>Used on this device</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--y-hi)', marginBottom: 14 }}>
          {(downloadMb + cacheMb).toFixed(1)} MB used
        </div>
        {/* Two-segment bar */}
        <div style={{ height: 7, borderRadius: 4, background: 'var(--y-line)', overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ display: 'flex', height: '100%' }}>
            <div style={{ width: `${downloadMb > 0 ? 60 : 0}%`, background: 'var(--y-p)', transition: 'width 300ms' }} />
            <div style={{ width: `${cacheMb > 0 ? 20 : 0}%`, background: 'var(--y-dim)', transition: 'width 300ms' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--y-p)' }} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--y-mid)' }}>Downloads · permanent</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--y-dim)' }} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--y-mid)' }}>Read cache · evictable</span>
          </div>
        </div>
      </div>

      {/* Downloads section */}
      <div style={{ padding: '0 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--y-hi)' }}>Downloads</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--y-dim)' }}>Keep 5 ahead</span>
        </div>

        {groups.length === 0 && (
          <div style={{ background: 'var(--y-surf)', border: '1px solid var(--y-line)', borderRadius: 14, padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--y-dim)', margin: 0 }}>No downloads yet</p>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--y-dim)', marginTop: 4 }}>Open a series and tap the download button.</p>
          </div>
        )}

        {groups.map(g => (
          <div key={g.seriesId} style={{ background: 'var(--y-surf)', border: '1px solid var(--y-line)', borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
            <button onClick={() => toggleGroup(g.seriesId)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 54, height: 74, borderRadius: 8, background: 'var(--y-line)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--y-hi)', marginBottom: 2 }}>{g.title}</div>
                <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--y-dim)' }}>{g.chapters} chapters · {g.sizeMb.toFixed(1)} MB</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--y-ok)', marginTop: 2 }}>Permanent · protected</div>
              </div>
              <div style={{ color: 'var(--y-dim)', flexShrink: 0, transition: 'transform 200ms', transform: g.expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <ChevronDown size={18} />
              </div>
            </button>
            {g.expanded && (
              <div style={{ background: 'var(--y-surf2)', borderTop: '1px solid var(--y-line)' }}>
                <button style={{ width: '100%', height: 50, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid var(--y-line2)', color: 'var(--y-a)', fontSize: 13, fontWeight: 700 }}>
                  <Trash2 size={16} style={{ color: 'var(--y-a)' }} /> Delete download
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Read cache section */}
      <div style={{ padding: '16px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--y-hi)' }}>Read cache</span>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-a)', fontSize: 11, fontWeight: 800 }}>Clear</button>
        </div>
        <p style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', lineHeight: 1.55 }}>
          Read cache is evicted oldest-first when space runs low. Downloads are never removed without asking.
        </p>
      </div>
    </div>
  )
}
