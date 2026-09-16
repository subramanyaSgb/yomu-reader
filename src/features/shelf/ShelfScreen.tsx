// One screen per shelf: Reading / Want to Read / Completed. The whole app is these
// three grids over the curated catalog (src/catalog.ts) — no external discovery.

import { useEffect, useRef, useState } from 'react'
import { Search, X, CalendarClock, Settings, History } from 'lucide-react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { CATALOG, type CatalogEntry } from '../../catalog'
import { kkCoverUrl, kkChapters, kkHealth } from '../../lib/kakalot/client'
import { coverHue } from '../../components/CoverGradient'
import { getReadList } from '../reader/readTracking'
import { getSeriesMeta } from './seriesMeta'
import { getProgress } from '../../lib/db/repo'
import { exportBackup, importBackup } from '../backup/backup'
import { downloadsSummary, clearAllDownloads, formatBytes } from '../offline/manage'
import { isPushEnabled, enablePush, disablePush, syncPushState } from '../push/push'
import { downloadChapter, isDownloaded } from '../offline/downloads'
import { kkPages as fetchKkPages, buildKakalotImageUrl } from '../../lib/kakalot/client'
import { useShelves, shelfOf, type Shelf } from './shelf'
import type { SeriesSource } from '../../App'

interface CardInfo { pct?: number; lastNumber?: string | null; at?: number; autoDl?: boolean }

// Session guard so auto-download runs once per series per app session.
const autoDownloaded = new Set<string>()

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

function Card({ entry, info, hasNew, onOpen }: { entry: CatalogEntry; info?: CardInfo; hasNew?: boolean; onOpen: (id: string, src: SeriesSource) => void }) {
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
        {hasNew && (
          <span style={{ position: 'absolute', top: 6, left: 6, background: 'var(--y-a)', color: 'var(--y-onp)', fontSize: 9, fontWeight: 800, borderRadius: 7, padding: '3px 6px', letterSpacing: '0.05em' }}>NEW</span>
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
  onHistory,
}: {
  shelf: Shelf
  onOpen: (id: string, source: SeriesSource) => void
  onUpcoming?: () => void
  onHistory?: () => void
}) {
  const { shelves, loaded } = useShelves()
  const [term, setTerm] = useState('')
  const [info, setInfo] = useState<Record<string, CardInfo>>({})
  const [backupSheet, setBackupSheet] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const q = term.trim().toLowerCase()

  // Source health → banner when a source is down (checked at most every 5 min).
  const health = useQuery({ queryKey: ['health'], queryFn: kkHealth, staleTime: 5 * 60 * 1000, retry: 1 })
  const downSources = health.data
    ? ([health.data.weebcentral ? null : 'WeebCentral', health.data.comizy ? null : 'Comizy'].filter(Boolean) as string[])
    : []

  // NEW-chapter detection for the Reading shelf (chapter lists are 10-min cached).
  const readingIds = CATALOG.filter(e => !e.unavailable && shelfOf(shelves, e.id) === 'reading').map(e => e.id).slice(0, 20)
  const newChecks = useQueries({
    queries: (shelf === 'reading' ? readingIds : []).map(id => ({
      queryKey: ['kk', 'chapters', id],
      queryFn: () => kkChapters(id),
      staleTime: 10 * 60 * 1000,
      retry: 1,
    })),
  })
  const hasNewMap: Record<string, boolean> = {}
  if (shelf === 'reading') {
    readingIds.forEach((id, i) => {
      const chs = newChecks[i]?.data?.chapters
      const latest = chs?.[chs.length - 1]?.number
      const last = info[id]?.lastNumber
      hasNewMap[id] = !!(latest && last && parseFloat(latest) > parseFloat(last))
    })
  }
  const anyNew = Object.values(hasNewMap).some(Boolean)

  // Auto-download new chapters (max 3/series per session, skips data-saver mode) so
  // fresh releases are readable offline without pressing anything.
  useEffect(() => {
    if (shelf !== 'reading' || !navigator.onLine) return
    if ((navigator as { connection?: { saveData?: boolean } }).connection?.saveData) return
    void (async () => {
      for (let i = 0; i < readingIds.length; i++) {
        const id = readingIds[i]
        if (!hasNewMap[id] || autoDownloaded.has(id)) continue
        if (info[id]?.autoDl === false) continue // per-series opt-out
        autoDownloaded.add(id)
        const chs = newChecks[i]?.data?.chapters ?? []
        const last = info[id]?.lastNumber
        if (!last) continue
        const fresh = chs.filter(c => c.number != null && parseFloat(c.number) > parseFloat(last)).slice(0, 3)
        for (const ch of fresh) {
          try {
            if (await isDownloaded(ch.id)) continue
            const pages = await fetchKkPages(ch.id)
            await downloadChapter({ chapterId: ch.id, seriesId: id, proxyUrls: pages.map(p => buildKakalotImageUrl(p.src, ch.id)) }, 'auto')
          } catch { /* silent — it's a convenience prefetch */ }
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyNew, shelf])

  // Storage summary + push status for the settings sheet
  const [storage, setStorage] = useState<{ chapters: number; bytes: number } | null>(null)
  const [pushOn, setPushOn] = useState<boolean | null>(null)
  const [pushMsg, setPushMsg] = useState('')
  useEffect(() => {
    if (backupSheet) {
      downloadsSummary().then(setStorage)
      isPushEnabled().then(setPushOn)
    }
  }, [backupSheet])

  // Keep the push server's view of the reading list fresh (throttled internally).
  useEffect(() => {
    if (loaded) void syncPushState()
  }, [loaded, shelves])

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
          autoDl: meta?.autoDl,
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
            <button onClick={onUpcoming} aria-label="Upcoming chapters" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-mid)', position: 'relative' }}>
              <CalendarClock size={20} />
              {anyNew && <span style={{ position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: '50%', background: 'var(--y-a)' }} />}
            </button>
          )}
          {onHistory && (
            <button onClick={onHistory} aria-label="Reading history" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-mid)' }}>
              <History size={20} />
            </button>
          )}
          <button onClick={() => { setBackupSheet(true); setBackupMsg(''); setPushMsg('') }} aria-label="Settings" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-mid)' }}>
            <Settings size={20} />
          </button>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--y-dim)' }}>{entries.length} series</span>
        </div>
      </header>

      {/* Source-down banner */}
      {downSources.length > 0 && (
        <div style={{ margin: '0 18px 12px', padding: '10px 14px', borderRadius: 12, background: 'rgba(242,193,78,0.12)', border: '1px solid rgba(242,193,78,0.4)' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--y-a)' }}>
            {downSources.join(' and ')} {downSources.length > 1 ? 'are' : 'is'} not responding — affected series may not load right now.
          </span>
        </div>
      )}

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
        {entries.map(e => <Card key={e.title} entry={e} info={info[e.id]} hasNew={hasNewMap[e.id]} onOpen={onOpen} />)}
      </div>

      {/* Backup sheet */}
      {backupSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.6)' }} onClick={() => setBackupSheet(false)}>
          <div style={{ width: '100%', borderRadius: '20px 20px 0 0', background: 'var(--y-surf)', border: '1px solid var(--y-line)', padding: '20px 18px 30px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--y-hi)', marginBottom: 6 }}>Backup</div>
            <p style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--y-dim)', marginBottom: 16, lineHeight: 1.5 }}>
              Shelves, progress, exact positions and read marks live only on this device. Export a file now and then; import it to restore on any device.
            </p>
            <button onClick={() => { void exportBackup(); setBackupMsg('Backup file downloaded.') }}
              style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', background: 'var(--y-p)', color: 'var(--y-onp)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
              Export backup
            </button>
            <button onClick={() => fileRef.current?.click()}
              style={{ width: '100%', height: 48, borderRadius: 12, border: '1px solid var(--y-line)', background: 'var(--y-surf2)', color: 'var(--y-hi)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
              Import backup file
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }}
              onChange={async e => {
                const f = e.target.files?.[0]
                if (!f) return
                try {
                  const r = await importBackup(f)
                  setBackupMsg(`Restored ${r.settings} settings + ${r.progress} progress records. Reloading…`)
                  setTimeout(() => location.reload(), 1200)
                } catch (err) {
                  setBackupMsg(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
                }
              }} />
            {backupMsg && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--y-ok)', marginBottom: 10 }}>{backupMsg}</div>}
            {/* Notifications */}
            <div style={{ borderTop: '1px solid var(--y-line)', paddingTop: 14, marginTop: 4, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--y-hi)' }}>New-chapter notifications</span>
              <button
                disabled={pushOn === null}
                onClick={async () => {
                  if (pushOn) { await disablePush(); setPushOn(false); setPushMsg('Notifications off.') }
                  else {
                    const r = await enablePush()
                    if (r.ok) { setPushOn(true); setPushMsg('Enabled — checks run every 2 hours.') }
                    else setPushMsg(r.reason ?? 'Could not enable')
                  }
                }}
                style={{ height: 34, padding: '0 14px', borderRadius: 9, border: '1px solid var(--y-line)', background: pushOn ? 'var(--y-pa)' : 'none', color: pushOn ? 'var(--y-plt)' : 'var(--y-mid)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                {pushOn === null ? '…' : pushOn ? 'On' : 'Off'}
              </button>
            </div>
            {pushMsg && <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--y-dim)', marginBottom: 10 }}>{pushMsg}</div>}
            {/* Storage */}
            <div style={{ borderTop: '1px solid var(--y-line)', paddingTop: 14, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--y-hi)' }}>
                Offline storage{storage ? ` — ${storage.chapters} chapters · ${formatBytes(storage.bytes)}` : '…'}
              </span>
              {storage != null && storage.chapters > 0 && (
                <button onClick={async () => { await clearAllDownloads(); setStorage({ chapters: 0, bytes: 0 }) }}
                  style={{ height: 34, padding: '0 12px', borderRadius: 9, border: '1px solid var(--y-line)', background: 'none', color: 'var(--y-warn)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                  Clear all
                </button>
              )}
            </div>
            <button onClick={() => setBackupSheet(false)}
              style={{ width: '100%', height: 44, borderRadius: 12, border: 'none', background: 'none', color: 'var(--y-dim)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
