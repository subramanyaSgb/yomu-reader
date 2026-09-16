import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAuth, signInWithGoogle, signOut } from './auth'
import { runSync } from './engine'
import { registerPush } from '../notifications/messaging'
import { getRollups } from '../stats/statsRepo'
import { totalChapters, totalSeconds, currentStreak, genreBreakdown, dayKey } from '../stats/statsLogic'
import { applyTheme } from '../../styles/theme'
import type { Theme } from '../../styles/theme'
import type { DailyRollup } from '../stats/statsLogic'

const THEMES: { id: Theme; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'sepia', label: 'Sepia' },
]

const THEME_PALETTES: Record<Theme, { bg: string; hi: string; mid: string; p: string }> = {
  dark:  { bg: '#0A0E0C', hi: '#F2F7F4', mid: '#93A29B', p: '#17B57E' },
  light: { bg: '#F6F7F5', hi: '#0E1512', mid: '#5C6B64', p: '#0E8F62' },
  sepia: { bg: '#F1E3C9', hi: '#2C2114', mid: '#6B5A42', p: '#8A5A2B' },
}

const GENRE_HUES = ['#17B57E', '#0FA0A8', '#4F9BE0', '#8B6BE0', '#D9557A']

interface SettingRow { label: string; sub: string; content: React.ReactNode }

export default function ProfileScreen({ onLocalFiles }: { onLocalFiles?: () => void }) {
  const { user, isSyncEnabled } = useAuth()
  const [theme, setTheme] = useState<Theme>('dark')
  const [rollups, setRollups] = useState<Record<string, DailyRollup>>({})
  const [expandedSetting, setExpandedSetting] = useState<string | null>(null)
  const [wifiOnly, setWifiOnly] = useState(true)
  const [dataSaver, setDataSaver] = useState(false)
  const [newChPush, setNewChPush] = useState(false)
  const [streakRemind, setStreakRemind] = useState(false)
  const [nightWarmth, setNightWarmth] = useState(true)
  const [wakeLock, setWakeLock] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('yomu-theme') as Theme | null
    setTheme(stored ?? 'dark')
    getRollups().then(setRollups)
  }, [])

  function switchTheme(t: Theme) {
    setTheme(t); applyTheme(t)
  }

  const today = dayKey(Date.now())
  const chapters = totalChapters(rollups)
  const hours = Math.round((totalSeconds(rollups) / 3600) * 10) / 10
  const streak = currentStreak(rollups, today)
  const genres = genreBreakdown(rollups).slice(0, 5)
  const maxGenre = genres[0]?.[1] ?? 1

  function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
      <div onClick={() => onChange(!on)} style={{ width: 44, height: 26, borderRadius: 13, background: on ? 'var(--y-p)' : 'var(--y-line)', position: 'relative', cursor: 'pointer', transition: 'background 200ms', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 200ms', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </div>
    )
  }

  const SETTINGS: SettingRow[] = [
    {
      label: 'Reader defaults',
      sub: 'RTL manga · Fit width · vertical manhwa',
      content: (
        <div style={{ padding: '4px 0 8px' }}>
          <SettingToggleRow label="RTL for manga" value={<Toggle on={true} onChange={() => {}} />} />
          <SettingToggleRow label="Volume keys turn pages" value={<Toggle on={false} onChange={() => {}} />} />
        </div>
      ),
    },
    {
      label: 'Downloads & storage',
      sub: 'Keep 5 ahead · wifi only',
      content: (
        <div style={{ padding: '4px 0 8px' }}>
          <SettingToggleRow label="Wifi only" value={<Toggle on={wifiOnly} onChange={setWifiOnly} />} />
          <SettingToggleRow label="Data saver" value={<Toggle on={dataSaver} onChange={setDataSaver} />} />
          <p style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', lineHeight: 1.55, marginTop: 8 }}>Downloads are permanent and storage-persisted. Read cache is evicted oldest-first.</p>
        </div>
      ),
    },
    {
      label: 'Notifications',
      sub: '1 series · batched digest',
      content: (
        <div style={{ padding: '4px 0 8px' }}>
          <SettingToggleRow label="New chapter push" value={<Toggle on={newChPush} onChange={v => { setNewChPush(v); if (v) registerPush() }} />} />
          <SettingToggleRow label="Goal & streak reminders" value={<Toggle on={streakRemind} onChange={setStreakRemind} />} />
          <p style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', lineHeight: 1.55, marginTop: 8 }}>Polled every 30–60 min and delivered as one digest, not one push per chapter.</p>
        </div>
      ),
    },
    {
      label: 'Comfort',
      sub: 'Night warmth on · wake lock on',
      content: (
        <div style={{ padding: '4px 0 8px' }}>
          <SettingToggleRow label="Night warmth" value={<Toggle on={nightWarmth} onChange={setNightWarmth} />} />
          <SettingToggleRow label="Keep screen awake" value={<Toggle on={wakeLock} onChange={setWakeLock} />} />
        </div>
      ),
    },
    {
      label: 'Backup & local files',
      sub: 'Export library · open CBZ / PDF / folder',
      content: (
        <div style={{ padding: '4px 0 8px' }}>
          <button style={{ height: 44, width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 700, color: 'var(--y-plt)', padding: '0 47px' }}>Export library + progress (JSON)</button>
          {onLocalFiles && <button onClick={onLocalFiles} style={{ height: 44, width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 700, color: 'var(--y-plt)', padding: '0 47px' }}>Open local files</button>}
        </div>
      ),
    },
    {
      label: 'About Yomu',
      sub: 'v1.0 · personal-use client',
      content: (
        <p style={{ padding: '4px 47px 12px', fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', lineHeight: 1.55 }}>
          Personal-use PWA. Metadata and chapters from MangaDex; images proxied for CORS. Not distributed. Where a series is licensed in English, Yomu links to the official release.
        </p>
      ),
    },
  ]

  const avatarLetter = user?.displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'Y'

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%', paddingBottom: 32 }}>
      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 18px 0' }}>
        <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(140deg, var(--y-p), var(--y-a))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'var(--y-onp)', flexShrink: 0 }}>
          {avatarLetter}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--y-hi)', lineHeight: 1.2 }}>
            {user ? (user.displayName ?? user.email?.split('@')[0]) : 'Local account'}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--y-dim)', marginTop: 2 }}>
            {user ? 'Google · synced just now' : 'Not signed in — everything stays on this device'}
          </div>
        </div>
        {isSyncEnabled && (
          user
            ? <button onClick={() => signOut()} style={{ height: 40, padding: '0 14px', borderRadius: 20, border: '1.5px solid var(--y-line)', background: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: 'var(--y-mid)' }}>Sign out</button>
            : <button onClick={() => signInWithGoogle()} style={{ height: 40, padding: '0 14px', borderRadius: 20, background: 'var(--y-p)', border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: 'var(--y-onp)' }}>Sign in</button>
        )}
      </div>

      {/* Stats 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '20px 18px 0' }}>
        {[
          { value: chapters, label: 'Chapters read', color: 'var(--y-hi)' },
          { value: `${streak}d`, label: 'Day streak', color: 'var(--y-a)' },
          { value: hours, label: 'Hours spent', color: 'var(--y-hi)' },
          { value: '0', label: 'Series following', color: 'var(--y-plt)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--y-surf)', border: '1px solid var(--y-line)', borderRadius: 16, padding: '16px 14px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--y-mid)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Genre breakdown */}
      {genres.length > 0 && (
        <div style={{ margin: '16px 18px 0', background: 'var(--y-surf)', border: '1px solid var(--y-line)', borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--y-hi)', marginBottom: 12 }}>Genre breakdown</div>
          {genres.map(([g, n], i) => (
            <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 78, fontSize: 11, fontWeight: 700, color: 'var(--y-hi)', flexShrink: 0 }}>{g}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--y-line)' }}>
                <div style={{ height: '100%', width: `${(n / maxGenre) * 100}%`, borderRadius: 4, background: GENRE_HUES[i % GENRE_HUES.length] }} />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--y-dim)', flexShrink: 0 }}>{n}</span>
            </div>
          ))}
        </div>
      )}

      {/* Theme selector */}
      <div style={{ padding: '16px 18px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--y-hi)', marginBottom: 12 }}>Theme</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {THEMES.map(t => {
            const p = THEME_PALETTES[t.id]
            const active = theme === t.id
            return (
              <button key={t.id} onClick={() => switchTheme(t.id)} style={{
                borderRadius: 14, overflow: 'hidden', border: `2px solid ${active ? 'var(--y-p)' : 'var(--y-line)'}`,
                background: 'none', cursor: 'pointer', padding: 0,
              }}>
                {/* Preview swatch */}
                <div style={{ height: 52, background: p.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, padding: '0 10px' }}>
                  {[p.hi, p.mid, p.p].map((c, i) => (
                    <div key={i} style={{ height: 3, borderRadius: 2, background: c, width: i === 0 ? '80%' : i === 1 ? '60%' : '50%' }} />
                  ))}
                </div>
                <div style={{ padding: '6px 0', fontSize: 11, fontWeight: 700, color: active ? 'var(--y-hi)' : 'var(--y-mid)', background: 'var(--y-surf)', textAlign: 'center' }}>{t.label}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Settings expandable rows */}
      <div style={{ padding: '16px 18px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--y-hi)', marginBottom: 12 }}>Settings</div>
        <div style={{ background: 'var(--y-surf)', border: '1px solid var(--y-line)', borderRadius: 16, overflow: 'hidden' }}>
          {SETTINGS.map((row, i) => {
            const expanded = expandedSetting === row.label
            return (
              <div key={row.label} style={{ borderTop: i > 0 ? '1px solid var(--y-line2)' : undefined }}>
                <button onClick={() => setExpandedSetting(expanded ? null : row.label)} style={{
                  width: '100%', minHeight: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--y-surf2)', border: '1px solid var(--y-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {['📖','💾','🔔','🌙','📁','ℹ'][i]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--y-hi)' }}>{row.label}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', marginTop: 1 }}>{row.sub}</div>
                  </div>
                  <div style={{ color: 'var(--y-dim)', transition: 'transform 200ms', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                    <ChevronRight size={16} />
                  </div>
                </button>
                {expanded && (
                  <div style={{ background: 'var(--y-surf2)', borderTop: '1px solid var(--y-line2)' }}>
                    {row.content}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sync button when logged in */}
      {isSyncEnabled && user && (
        <div style={{ padding: '16px 18px 0' }}>
          <button onClick={() => runSync()} style={{ width: '100%', height: 48, borderRadius: 14, background: 'var(--y-surf)', border: '1px solid var(--y-line)', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--y-plt)' }}>
            Sync now
          </button>
        </div>
      )}
    </div>
  )
}

function SettingToggleRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 0 47px', minHeight: 44 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--y-hi)' }}>{label}</span>
      {value}
    </div>
  )
}
