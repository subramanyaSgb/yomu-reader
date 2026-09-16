// Reading stats, computed from the history log (last 500 chapters).

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { getHistory, type HistoryEntry } from './history'

interface Stats {
  today: number
  week: number
  total: number
  streak: number
  perDay: number
  top: Array<{ title: string; count: number }>
}

function compute(entries: HistoryEntry[]): Stats {
  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const weekAgo = now.getTime() - 7 * 86_400_000
  const monthAgo = now.getTime() - 30 * 86_400_000

  const days = new Set(entries.map(e => new Date(e.at).toDateString()))
  let streak = 0
  for (let d = new Date(dayStart); days.has(d.toDateString()); d.setDate(d.getDate() - 1)) streak++

  const counts = new Map<string, number>()
  for (const e of entries) counts.set(e.title, (counts.get(e.title) ?? 0) + 1)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([title, count]) => ({ title, count }))

  const monthEntries = entries.filter(e => e.at >= monthAgo)
  return {
    today: entries.filter(e => e.at >= dayStart.getTime()).length,
    week: entries.filter(e => e.at >= weekAgo).length,
    total: entries.length,
    streak,
    perDay: Math.round((monthEntries.length / 30) * 10) / 10,
    top,
  }
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ flex: 1, minWidth: 90, background: 'var(--y-surf)', border: '1px solid var(--y-line)', borderRadius: 14, padding: '14px 12px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--y-hi)' }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--y-dim)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}

export default function StatsScreen({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => { getHistory().then(l => setStats(compute(l))) }, [])

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%', paddingBottom: 24 }}>
      <header style={{ height: 58, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px' }}>
        <button onClick={onBack} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-hi)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--y-hi)' }}>Reading stats</h1>
      </header>

      {stats && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '6px 18px 18px' }}>
            <Tile label="Today" value={stats.today} />
            <Tile label="This week" value={stats.week} />
            <Tile label="Day streak" value={stats.streak} />
            <Tile label="Ch / day (30d)" value={stats.perDay} />
          </div>

          {stats.top.length > 0 && (
            <div style={{ padding: '0 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--y-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Most read</div>
              {stats.top.map((t, i) => (
                <div key={t.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid var(--y-line2)' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--y-dim)', width: 18 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--y-hi)' }}>{t.title}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--y-mid)' }}>{t.count} ch</span>
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', padding: '18px 18px 0', lineHeight: 1.5 }}>
            Based on the last {stats.total} chapters in your reading history.
          </p>
        </>
      )}
    </div>
  )
}
