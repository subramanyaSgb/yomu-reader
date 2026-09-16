import { useEffect, useRef, useState } from 'react'
import { Search, X, Clock, WifiOff, RefreshCw } from 'lucide-react'
import { useSearch, mangaEnTitle, mangaCoverUrl } from '../../lib/mangadex/queries'
import { useKakalotSearch } from '../../lib/kakalot/queries'
import { getSetting, setSetting } from '../../lib/db/repo'
import { coverHue } from '../../components/CoverGradient'
import type { SeriesSource } from '../../App'

const PROXY_BASE = (import.meta.env?.VITE_IMAGE_PROXY as string | undefined) ?? 'http://localhost:8787'
function proxyCover(u: string) { const p = new URL('/img', PROXY_BASE); p.searchParams.set('u', u); return p.toString() }

const RECENT_KEY = 'search:recent'
const FILTERS = ['All', 'Ongoing', 'Completed', 'Action', 'Romance', 'Fantasy', '2026'] as const

export default function SearchScreen({ onOpen }: { onOpen: (id: string, source: SeriesSource) => void }) {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [scope, setScope] = useState<'global' | 'library'>('global')
  const [recent, setRecent] = useState<string[]>([])
  const [online, setOnline] = useState(navigator.onLine)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSetting<string[]>(RECENT_KEY).then(r => setRecent(r ?? []))
    const on = () => setOnline(true); const off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 350)
    return () => clearTimeout(t)
  }, [term])

  const mdSearch = useSearch(debounced)
  const kkSearch = useKakalotSearch(debounced)

  function remember(q: string) {
    if (!q) return
    const next = [q, ...recent.filter(r => r !== q)].slice(0, 8)
    setRecent(next); void setSetting(RECENT_KEY, next)
  }
  function clearRecent() { setRecent([]); void setSetting(RECENT_KEY, []) }

  const mdResults = mdSearch.data?.data ?? []
  const kkResults = kkSearch.data ?? []
  const totalResults = mdResults.length + kkResults.length
  const isLoading = mdSearch.isLoading || kkSearch.isLoading
  const hasQuery = debounced.length > 0

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%', paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--y-hi)' }}>Search</h1>
          {/* Segmented control */}
          <div style={{ display: 'flex', background: 'var(--y-surf)', borderRadius: 10, padding: 3, gap: 2, border: '1px solid var(--y-line)' }}>
            {(['global','library'] as const).map(s => (
              <button key={s} onClick={() => setScope(s)} style={{
                height: 28, padding: '0 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: scope === s ? 'var(--y-p)' : 'transparent',
                color: scope === s ? 'var(--y-onp)' : 'var(--y-mid)',
                fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
              }}>{s === 'global' ? 'Global' : 'Library'}</button>
            ))}
          </div>
        </div>

        {/* Search field */}
        <div style={{ position: 'relative', height: 50, marginBottom: 12 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--y-dim)' }} />
          <input
            ref={inputRef}
            value={term}
            onChange={e => setTerm(e.target.value)}
            onBlur={() => remember(debounced)}
            placeholder={scope === 'global' ? 'Titles, authors, genres' : 'Search my library'}
            style={{
              width: '100%', height: '100%', background: 'var(--y-surf)',
              border: '1px solid var(--y-line)', borderRadius: 14,
              paddingLeft: 42, paddingRight: term ? 80 : 14,
              fontSize: 14, fontWeight: 600, color: 'var(--y-hi)', outline: 'none',
            }}
          />
          {term && (
            <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <button style={{ fontSize: 10, fontWeight: 800, color: 'var(--y-plt)', background: 'none', border: 'none', cursor: 'pointer' }}>SAVE</button>
              <button onClick={() => { setTerm(''); setDebounced('') }} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--y-line)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--y-mid)' }}><X size={14} /></button>
            </div>
          )}
        </div>

        {/* Filter chips */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)} style={{
              height: 34, padding: '0 14px', borderRadius: 10, border: '1px solid var(--y-line)',
              background: activeFilter === f ? 'var(--y-p)' : 'var(--y-surf)',
              color: activeFilter === f ? 'var(--y-onp)' : 'var(--y-mid)',
              fontSize: 11.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Offline state */}
      {!online && scope === 'global' && (
        <div style={{ margin: '0 18px 16px', background: 'var(--y-surf)', border: '1px solid var(--y-line)', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <WifiOff size={16} style={{ color: 'var(--y-warn)' }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--y-hi)' }}>MangaDex unreachable</span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--y-mid)', lineHeight: 1.55, marginBottom: 16 }}>
            You are offline, so global search is unavailable. Your library and downloaded chapters still work.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ height: 42, flex: 1, borderRadius: 11, background: 'var(--y-p)', color: 'var(--y-onp)', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <RefreshCw size={14} /> Retry
            </button>
            <button style={{ height: 42, flex: 1, borderRadius: 11, background: 'transparent', border: '1.5px solid var(--y-line)', color: 'var(--y-hi)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Search my library
            </button>
          </div>
        </div>
      )}

      {/* Results count */}
      {hasQuery && !isLoading && (
        <div style={{ padding: '0 18px 12px', fontSize: 12, fontWeight: 600, color: 'var(--y-dim)' }}>{totalResults} results</div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px', padding: '0 18px' }}>
          {[0,1,2,3].map(i => <div key={i} style={{ height: 240, borderRadius: 16, background: 'var(--y-surf)' }} />)}
        </div>
      )}

      {/* MangaDex results */}
      {!isLoading && mdResults.length > 0 && (
        <div style={{ padding: '0 18px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--y-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>MangaDex</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
            {mdResults.map(m => {
              const raw = mangaCoverUrl(m); const cover = raw ? proxyCover(raw) : null
              const title = mangaEnTitle(m); const hue = coverHue(m.id)
              return (
                <button key={m.id} onClick={() => { remember(debounced); onOpen(m.id, 'mangadex') }}
                  style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <div style={{ borderRadius: 16, overflow: 'hidden', position: 'relative', aspectRatio: '110/152',
                    background: `linear-gradient(150deg, ${hue} 0%, color-mix(in oklab, ${hue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)` }}>
                    {cover && <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />}
                    <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
                      <span style={{ background: 'var(--y-p)', color: 'var(--y-onp)', fontSize: 9, fontWeight: 800, borderRadius: 6, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {m.attributes.contentRating === 'safe' ? 'Manga' : 'Manga'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--y-hi)', marginTop: 6, lineHeight: 1.3,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{title}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--y-dim)', marginTop: 2 }}>{m.attributes.status}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Kakalot results */}
      {!isLoading && kkResults.length > 0 && (
        <div style={{ padding: '0 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--y-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Mangakakalot</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
            {kkResults.map(m => {
              const hue = coverHue(m.id)
              return (
                <button key={m.id} onClick={() => { remember(debounced); onOpen(m.id, 'kakalot') }}
                  style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '110/152', position: 'relative',
                    background: `linear-gradient(150deg, ${hue} 0%, color-mix(in oklab, ${hue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)` }}>
                    {m.cover && <img src={m.cover} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />}
                    <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
                      <span style={{ background: 'var(--y-ok)', color: 'var(--y-onp)', fontSize: 9, fontWeight: 800, borderRadius: 6, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>KK</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--y-hi)', marginTop: 6, lineHeight: 1.3,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{m.title}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state: recents + saved searches */}
      {!hasQuery && (
        <div style={{ padding: '0 18px' }}>
          {recent.length > 0 && (
            <>
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
                  <button onClick={e => { e.stopPropagation(); setRecent(prev => { const n = prev.filter(x => x !== r); void setSetting(RECENT_KEY, n); return n }) }}
                    style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-dim)' }}>
                    <X size={16} />
                  </button>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
