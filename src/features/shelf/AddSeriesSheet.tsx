// "Add series" sheet (Phase 19): the owner adds to the catalog from inside the app.
// One box takes a title or a link.
//   title → WeebCentral + Comizy, then again under the series' other English names
//           (from MangaDex) so a differently-named series is still found.
//   link  → WeebCentral/Comizy links resolve to their ids; any other site is checked
//           by the worker, which says how it can be read (reader / in-app site / as-is).

import { useEffect, useRef, useState } from 'react'
import { Check, Link2, Loader2, Plus, Search } from 'lucide-react'
import { kkResolve, kkSearch, kkCoverUrl, webEnabled, type ResolvedLink } from '../../lib/kakalot/client'
import { mdGet } from '../../lib/mangadex/client'
import type { MDList, MDManga } from '../../lib/mangadex/queries'
import { addUserSeries, CATALOG, sourceNameOf } from '../../catalog'
import { altTitles, bestScore, genresOf, linkIn, matchManga, rankHits, type Hit } from './addSeries'

type Phase = 'idle' | 'searching' | 'more' | 'checking' | 'done'

const MODE_NOTE: Record<'reader' | 'site' | 'external', string> = {
  reader: 'Reads in the Yomu reader, like your other series.',
  site: 'Chapters could not be listed, so it opens as a cleaned page inside Yomu and remembers your place.',
  external: 'This site blocks Yomu, so it opens as it is. Yomu cannot track your place there.',
}

const btn = {
  height: 34, padding: '0 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
  fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
} as const

export default function AddSeriesSheet({ initial, onClose }: { initial?: string; onClose: (added: number) => void }) {
  const [value, setValue] = useState(initial ?? '')
  const [phase, setPhase] = useState<Phase>('idle')
  const [hits, setHits] = useState<Hit[]>([])
  const [link, setLink] = useState<ResolvedLink | null>(null)
  const [linkTitle, setLinkTitle] = useState('')
  const [error, setError] = useState('')
  const [added, setAdded] = useState<Set<string>>(new Set())
  const run = useRef(0)
  const names = useRef<string[]>([])
  const manga = useRef<MDManga | null>(null)

  const inList = (id: string) => added.has(id) || CATALOG.some(e => e.id === id)

  async function search(q: string) {
    const me = ++run.current
    names.current = [q]
    manga.current = null
    let all: Hit[] = []
    const pull = async (name: string) => {
      const [wc, buddy] = await Promise.all([
        kkSearch(name).catch(() => []),
        kkSearch(name, 'buddy').catch(() => []),
      ])
      all = [...all, ...wc, ...buddy]
      if (me === run.current) setHits(rankHits(all, names.current).slice(0, 12))
    }
    setPhase('searching')
    await pull(q)
    if (me !== run.current) return
    // Same series, different English name: ask MangaDex what else it is called.
    setPhase('more')
    try {
      const res = await mdGet<MDList<MDManga>>('/manga', { title: q, limit: 5 })
      manga.current = matchManga(res.data ?? [], q)
    } catch { /* alt titles are a bonus */ }
    for (const alt of altTitles(manga.current, q)) {
      if (me !== run.current) return
      names.current = [...names.current, alt]
      await pull(alt)
    }
    if (me === run.current) setPhase('done')
  }

  async function check(url: string) {
    const me = ++run.current
    setPhase('checking')
    try {
      // WeebCentral series links need no worker round-trip (and no key).
      const wc = url.match(/^https?:\/\/(?:www\.)?weebcentral\.com\/series\/([A-Z0-9]+)\/([^/?#]+)/i)
      const r: ResolvedLink = wc
        ? { kind: 'known', id: `${wc[1]}/${wc[2]}`, title: decodeURIComponent(wc[2]).replace(/-/g, ' '), cover: kkCoverUrl(wc[1]) }
        : await kkResolve(url)
      if (me !== run.current) return
      setLink(r)
      setLinkTitle(r.title)
    } catch (e) {
      if (me === run.current) setError(e instanceof Error ? e.message : String(e))
    }
    if (me === run.current) setPhase('done')
  }

  function submit(raw = value) {
    const q = raw.trim()
    if (!q) return
    setError('')
    setHits([])
    setLink(null)
    const url = linkIn(q)
    if (url) void check(url)
    else void search(q)
  }

  // Opened from a shared link: check it straight away.
  useEffect(() => {
    if (initial) submit(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addHit(h: Hit) {
    // Borrow MangaDex genres only when this hit really is the series MangaDex matched.
    const sure = manga.current != null && bestScore(h.title, names.current) >= 0.5
    const ok = addUserSeries({
      title: h.title, id: h.id, wcTitle: h.title,
      cover: h.id.startsWith('buddy:') ? h.cover : undefined,
      genres: sure ? genresOf(manga.current) : [],
    })
    if (ok) setAdded(s => new Set(s).add(h.id))
    else setError(`“${h.title}” is already in your list.`)
  }

  function addLink() {
    if (!link) return
    const title = linkTitle.trim() || link.title
    const ok = addUserSeries({
      title, id: link.id, wcTitle: link.title,
      cover: link.kind === 'known' && !link.id.startsWith('buddy:') ? undefined : (link.cover || undefined),
      genres: [],
      mode: link.kind === 'web' && link.mode !== 'reader' ? link.mode : undefined,
    })
    if (ok) setAdded(s => new Set(s).add(link.id))
    else setError(`“${title}” is already in your list.`)
  }

  const busy = phase === 'searching' || phase === 'checking'
  const isLink = linkIn(value) != null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.6)' }} onClick={() => onClose(added.size)}>
      <div style={{ width: '100%', maxHeight: '88%', display: 'flex', flexDirection: 'column', borderRadius: '20px 20px 0 0', background: 'var(--y-surf)', border: '1px solid var(--y-line)', padding: '20px 18px 22px' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--y-hi)', marginBottom: 6 }}>Add series</div>
        <p style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--y-dim)', marginBottom: 12, lineHeight: 1.5 }}>
          Type a title, or paste the series link from any site.
        </p>

        <form onSubmit={e => { e.preventDefault(); submit() }} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Title or link"
            autoFocus={!initial}
            enterKeyHint="search"
            autoCapitalize="off" autoCorrect="off" spellCheck={false}
            style={{ flex: 1, minWidth: 0, height: 44, background: 'var(--y-surf2)', border: '1px solid var(--y-line)', borderRadius: 12, padding: '0 12px', fontSize: 13.5, fontWeight: 600, color: 'var(--y-hi)', outline: 'none' }}
          />
          <button type="submit" disabled={busy || !value.trim()} aria-label={isLink ? 'Check link' : 'Search'}
            style={{ ...btn, height: 44, width: 48, justifyContent: 'center', padding: 0, borderRadius: 12, background: 'var(--y-p)', color: 'var(--y-onp)', opacity: busy || !value.trim() ? 0.6 : 1 }}>
            {busy ? <Loader2 size={17} className="animate-spin" /> : isLink ? <Link2 size={17} /> : <Search size={17} />}
          </button>
        </form>

        {error && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--y-warn)', marginBottom: 10, lineHeight: 1.5 }}>{error}</div>}

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {phase === 'checking' && (
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--y-dim)', padding: '8px 0' }}>Checking how this site can be read…</p>
          )}

          {/* Pasted link */}
          {link && (
            <div style={{ borderRadius: 12, border: '1px solid var(--y-line)', background: 'var(--y-surf2)', padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 54, height: 74, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--y-line)' }}>
                  {link.cover && <img src={link.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} aria-label="Series title"
                    style={{ width: '100%', height: 34, background: 'var(--y-surf)', border: '1px solid var(--y-line)', borderRadius: 8, padding: '0 8px', fontSize: 13, fontWeight: 700, color: 'var(--y-hi)', outline: 'none', marginBottom: 6 }} />
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--y-a)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {sourceNameOf(link.id)}{link.kind === 'web' && link.mode === 'reader' ? ` · ${link.chapters} chapters` : ''}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--y-mid)', lineHeight: 1.5, margin: '0 0 10px' }}>
                {link.kind === 'web' ? MODE_NOTE[link.mode] : MODE_NOTE.reader}
              </p>
              {inList(link.id)
                ? <div style={{ ...btn, height: 40, justifyContent: 'center', background: 'var(--y-pa)', color: 'var(--y-plt)', cursor: 'default' }}><Check size={14} strokeWidth={3} /> In your list</div>
                : <button onClick={addLink} style={{ ...btn, height: 40, width: '100%', justifyContent: 'center', background: 'var(--y-p)', color: 'var(--y-onp)' }}><Plus size={15} /> Add to Want to Read</button>}
            </div>
          )}

          {/* Search results */}
          {hits.map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, border: '1px solid var(--y-line)', background: 'var(--y-surf2)', marginBottom: 8 }}>
              <div style={{ width: 40, height: 54, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--y-line)' }}>
                {h.cover && <img src={h.cover} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--y-hi)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{h.title}</div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--y-dim)', marginTop: 2 }}>{sourceNameOf(h.id)}</div>
              </div>
              {inList(h.id)
                ? <span style={{ ...btn, background: 'var(--y-pa)', color: 'var(--y-plt)', cursor: 'default' }}><Check size={13} strokeWidth={3} /> Added</span>
                : <button onClick={() => addHit(h)} style={{ ...btn, background: 'var(--y-p)', color: 'var(--y-onp)' }}><Plus size={14} /> Add</button>}
            </div>
          ))}

          {phase === 'more' && (
            <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--y-dim)', padding: '4px 0 8px' }}>Also checking other names for this series…</p>
          )}
          {phase === 'done' && !link && !error && hits.length === 0 && (
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--y-dim)', padding: '8px 0', lineHeight: 1.6 }}>
              Nothing found on WeebCentral or Comizy under that name. Find the series on any site in your browser and paste its link here{webEnabled() ? '' : ' (other sites need the one-time key setup first)'}.
            </p>
          )}
        </div>

        <button onClick={() => onClose(added.size)}
          style={{ width: '100%', height: 44, marginTop: 8, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: added.size ? 'var(--y-p)' : 'none', color: added.size ? 'var(--y-onp)' : 'var(--y-dim)' }}>
          {added.size ? `Done — ${added.size} added` : 'Close'}
        </button>
      </div>
    </div>
  )
}
