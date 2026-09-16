import { ArrowLeft } from 'lucide-react'
import type { SeriesSource } from '../../App'
import { coverHue } from '../../components/CoverGradient'

interface UnreadItem {
  seriesId: string
  seriesTitle: string
  chapterNum: string
  chapterTitle: string
  group: string
  timeAgo: string
  unreadCount: number
  source: SeriesSource
}

export default function UnreadScreen({
  onBack,
  onOpen,
}: {
  onBack: () => void
  onOpen: (id: string, source: SeriesSource) => void
}) {
  // In prod this would come from db.library join with latest chapter metadata
  const items: UnreadItem[] = []

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={onBack} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-hi)' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--y-hi)', lineHeight: 1.1 }}>New chapters</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--y-dim)' }}>{items.length} across followed series</div>
          </div>
        </div>
        <button style={{ height: 40, padding: '0 14px', borderRadius: 20, border: '1.5px solid var(--y-line)', background: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: 'var(--y-hi)' }}>
          Mark all read
        </button>
      </div>

      {items.length === 0 && (
        <div style={{ padding: '48px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--y-hi)', marginBottom: 4 }}>All caught up</p>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--y-dim)', lineHeight: 1.55 }}>No new chapters from followed series. Follow series from their detail page to see updates here.</p>
        </div>
      )}

      {items.map((item, i) => {
        const hue = coverHue(item.seriesId)
        return (
          <button key={`${item.seriesId}-${i}`} onClick={() => onOpen(item.seriesId, item.source)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            borderTop: '1px solid var(--y-line2)',
          }}>
            <div style={{ width: 48, height: 66, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
              background: `linear-gradient(150deg, ${hue} 0%, color-mix(in oklab, ${hue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)` }} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--y-hi)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.seriesTitle}</div>
              <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--y-mid)', marginBottom: 2 }}>Ch. {item.chapterNum} — {item.chapterTitle}</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--y-dim)' }}>{item.group} · {item.timeAgo}</div>
            </div>
            {item.unreadCount > 1 && (
              <span style={{ background: 'var(--y-a)', color: 'var(--y-onp)', fontSize: 10, fontWeight: 800, borderRadius: 11, minWidth: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>{item.unreadCount}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
