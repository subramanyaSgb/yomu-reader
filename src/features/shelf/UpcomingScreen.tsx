// Upcoming chapters (Netflix-style "coming soon") for the Reading shelf.
// Predicts each series' next-chapter date from the median gap between its recent
// chapter timestamps (WeebCentral publishes them in the chapter list).

import { ArrowLeft } from 'lucide-react'
import { useQueries } from '@tanstack/react-query'
import { CATALOG } from '../../catalog'
import { kkChapters, kkCoverUrl } from '../../lib/kakalot/client'
import { coverHue } from '../../components/CoverGradient'
import { useShelves, shelfOf } from './shelf'
import type { SeriesSource } from '../../App'

interface Prediction {
  id: string
  title: string
  latestNumber: string | null
  latestAt: number
  nextAt: number | null      // null = cadence unknown
  overdue: boolean
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}

function predict(id: string, title: string, chapters: { number: string | null; publishAt: string }[]): Prediction | null {
  const times = chapters.map(c => Date.parse(c.publishAt)).filter(t => !Number.isNaN(t))
  if (times.length === 0) return null
  times.sort((a, b) => a - b)
  const latestAt = times[times.length - 1]
  const recent = times.slice(-7)
  const gaps = recent.slice(1).map((t, i) => t - recent[i]).filter(g => g > 0)
  const gap = gaps.length >= 2 ? median(gaps) : null
  const nextAt = gap ? latestAt + gap : null
  return {
    id,
    title,
    latestNumber: chapters[chapters.length - 1]?.number ?? null,
    latestAt,
    nextAt,
    // If the prediction is long past, the schedule broke (hiatus/complete) — say so.
    overdue: nextAt != null && Date.now() > nextAt + (gap ?? 0),
  }
}

function fmtWhen(p: Prediction): string {
  if (p.nextAt == null || p.overdue) return 'No regular schedule — new chapters appear when released'
  const days = Math.round((p.nextAt - Date.now()) / 86_400_000)
  const day = new Date(p.nextAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  if (days <= 0) return 'New chapter any time now'
  if (days === 1) return `Expected tomorrow · ${day}`
  return `Expected in ${days} days · ${day}`
}

function timeAgo(t: number): string {
  const d = Math.round((Date.now() - t) / 86_400_000)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d}d ago`
  return `${Math.round(d / 30)}mo ago`
}

export default function UpcomingScreen({
  onBack,
  onOpen,
}: {
  onBack: () => void
  onOpen: (id: string, source: SeriesSource) => void
}) {
  const { shelves, loaded } = useShelves()
  const reading = CATALOG.filter(e => !e.unavailable && shelfOf(shelves, e.id) === 'reading')

  const results = useQueries({
    queries: reading.map(e => ({
      queryKey: ['kk', 'chapters', e.id],
      queryFn: () => kkChapters(e.id),
      staleTime: 10 * 60 * 1000,
    })),
  })

  const loading = results.some(r => r.isLoading)
  const covers = new Map(reading.map(e => [e.id, e.cover]))
  const predictions = reading
    .map((e, i) => (results[i].data ? predict(e.id, e.title, results[i].data.chapters) : null))
    .filter((p): p is Prediction => p !== null)
    .sort((a, b) => {
      const ax = a.nextAt == null || a.overdue ? Infinity : a.nextAt
      const bx = b.nextAt == null || b.overdue ? Infinity : b.nextAt
      return ax - bx || b.latestAt - a.latestAt
    })

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%', paddingBottom: 24 }}>
      <header style={{ height: 58, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px' }}>
        <button onClick={onBack} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-hi)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--y-hi)' }}>Upcoming chapters</h1>
      </header>
      <p style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--y-dim)', padding: '0 18px 14px', lineHeight: 1.5 }}>
        Estimated from each series’ recent release rhythm. Chapters appear in the app as soon as the source has them.
      </p>

      {loaded && reading.length === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--y-dim)', textAlign: 'center', padding: '30px 18px' }}>
          Nothing on your Reading shelf yet — start a series and it shows up here.
        </p>
      )}

      {loading && (
        <div style={{ padding: '0 18px' }}>
          {[0, 1, 2].map(i => <div key={i} style={{ height: 84, borderRadius: 14, background: 'var(--y-surf)', marginBottom: 10 }} />)}
        </div>
      )}

      {predictions.map(p => {
        const hue = coverHue(p.id)
        return (
          <button key={p.id} onClick={() => onOpen(p.id, 'kakalot')} style={{
            width: 'calc(100% - 36px)', margin: '0 18px 10px', display: 'flex', gap: 12, alignItems: 'center',
            background: 'var(--y-surf)', border: '1px solid var(--y-line)', borderRadius: 14,
            padding: 10, cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ width: 46, height: 64, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
              background: `linear-gradient(150deg, ${hue} 0%, var(--y-bg) 100%)` }}>
              <img src={covers.get(p.id) ?? kkCoverUrl(p.id)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--y-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: p.nextAt != null && !p.overdue && p.nextAt - Date.now() < 86_400_000 ? 'var(--y-ok)' : 'var(--y-mid)', marginTop: 3 }}>
                {fmtWhen(p)}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', marginTop: 3 }}>
                Latest: Ch. {p.latestNumber ?? '?'} · {timeAgo(p.latestAt)}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
