import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, Download, Star, ChevronDown, ExternalLink, ChevronUp
} from 'lucide-react'
import { useShelves, shelfOf, type Shelf } from '../shelf/shelf'
import { useReadSet } from '../reader/readTracking'
import { restoreProgress } from '../reader/resume'
import {
  useManga, useChapterFeed, mangaEnTitle, mangaCoverUrl,
  type MDChapter,
} from '../../lib/mangadex/queries'
import { useKakalotSearch, useKakalotChapters } from '../../lib/kakalot/queries'
import { useComickComic, useComickChapters } from '../../lib/comick/queries'
import { comickCoverFrom } from '../../lib/comick/client'
import { coverHue } from '../../components/CoverGradient'
import type { SeriesSource } from '../../App'


function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

function groupName(ch: MDChapter): string {
  const rel = ch.relationships.find(r => r.type === 'scanlation_group') as any
  return rel?.attributes?.name ?? 'Unknown'
}

interface Props {
  id: string
  source: SeriesSource
  onBack: () => void
  onRead: (readId?: string, readSource?: SeriesSource, startChapterId?: string) => void
}

const STATUS_LABEL: Record<number, string> = { 1: 'ongoing', 2: 'completed', 3: 'cancelled', 4: 'hiatus' }

export default function SeriesDetail({ id, source, onBack, onRead }: Props) {
  const isComick = source === 'comick'
  const isKakalot = source === 'kakalot'
  const manga = useManga(source === 'mangadex' ? id : undefined)
  const feed = useChapterFeed(source === 'mangadex' ? id : undefined)
  const comic = useComickComic(isComick ? id : undefined)
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [synopsisExpanded, setSynopsisExpanded] = useState(false)
  const { shelves, set: setShelfState } = useShelves()
  const currentShelf = shelfOf(shelves, id)
  // Long series can have 3000+ chapters — rendering them all as DOM nodes janks the
  // page. Render in slices of 100 with a "Show more" button.
  const [chapterLimit, setChapterLimit] = useState(100)

  const m = manga.data?.data
  const c = comic.data
  const hue = coverHue(id)

  // Normalized display fields (source-aware). Kakalot fields fill in below once
  // the chapter feed (which carries title/cover) loads.
  const title = isComick ? (c?.title ?? '…') : (m ? mangaEnTitle(m) : '…')
  const cover = isComick ? comickCoverFrom(c?.md_covers) : (m ? mangaCoverUrl(m) : null)
  const synopsisText = isComick ? (c?.desc ?? '') : (m?.attributes.description?.en ?? '')
  const author = isComick ? '' : (m?.relationships?.find(r => r.type === 'author')?.attributes?.name ?? '')
  const statusLabel = isComick ? (c ? STATUS_LABEL[c.status] : '') : m?.attributes.status
  const genres: string[] = isComick
    ? (c?.md_comic_md_genres ?? []).map(g => g.md_genres?.name ?? '').filter(Boolean)
    : (m?.attributes.tags ?? [])
        .filter(t => t.attributes?.group === 'genre')
        .map(t => t.attributes?.name?.en ?? '')
        .filter(Boolean)

  const mdChapters = useMemo(() => {
    if (!feed.data) return []
    const readable = feed.data.data.filter(c => !c.attributes.externalUrl && c.attributes.pages > 0)
    return order === 'desc' ? [...readable].reverse() : readable
  }, [feed.data, order])

  // Comick chapters (metadata only — reading resolves via Kakalot)
  const ckFeed = useComickChapters(isComick ? c?.hid : undefined)
  const ckChapters = useMemo(() => {
    const chs = ckFeed.data?.chapters ?? []
    return order === 'desc' ? chs : [...chs].reverse()
  }, [ckFeed.data, order])

  const isLicensed = feed.data != null && mdChapters.length === 0 && source === 'mangadex'

  // WeebCentral ('kakalot' key): direct source for its own search results, the reader
  // for all Comick series (Comick's API doesn't expose page images), and checked for
  // EVERY MangaDex series — MD often has only a few stray readable chapters (the rest
  // external/licensed), so whichever source has more chapters wins.
  const kkSearch = useKakalotSearch(!isKakalot && title && title !== '…' ? title : '')
  const kkMangaId = isKakalot ? id : (kkSearch.data?.[0]?.id ?? null)
  const kkFeed = useKakalotChapters(kkMangaId ?? '')
  // Worker returns ascending; apply the Newest/Oldest toggle here (it previously only
  // affected the MD list — the button did nothing for WeebCentral chapters).
  const kkChapters = useMemo(() => {
    const chs = kkFeed.data?.chapters ?? []
    return order === 'desc' ? [...chs].reverse() : chs
  }, [kkFeed.data, order])
  const kkBetter = source === 'mangadex' && feed.data != null && kkChapters.length > mdChapters.length
  const showKkChapters = isKakalot || kkBetter

  // Read tracking + real continue point. Keyed by the id the reader uses as seriesId.
  const readSeriesId = (isComick || showKkChapters) ? kkMangaId : id
  const { readSet, toggle: toggleRead } = useReadSet(readSeriesId)
  const [lastReadChapterId, setLastReadChapterId] = useState<string | null>(null)
  useEffect(() => {
    if (!readSeriesId) return
    let alive = true
    restoreProgress(readSeriesId).then(p => { if (alive) setLastReadChapterId(p?.lastChapterId ?? null) })
    return () => { alive = false }
  }, [readSeriesId])

  const displayChapterCount = isComick ? ckChapters.length : (showKkChapters ? kkChapters.length : mdChapters.length)

  // Kakalot-source detail pages get title/cover from the chapter feed itself.
  const shownTitle = isKakalot ? (kkFeed.data?.title || '…') : title
  const shownCover = isKakalot ? (kkFeed.data?.cover || null) : cover

  const clamped = !synopsisExpanded && synopsisText.length > 148

  const firstMdChapter = mdChapters[mdChapters.length - 1]
  const lastMdChapter = mdChapters[0]

  // Real continue point from saved progress (not just "newest chapter").
  const continueKk = lastReadChapterId ? kkChapters.find(c => c.id === lastReadChapterId) : undefined
  const continueMd = lastReadChapterId ? mdChapters.find(c => c.id === lastReadChapterId) : undefined
  const unreadCount = showKkChapters
    ? kkChapters.filter(c => !readSet.has(c.id)).length
    : mdChapters.filter(c => !readSet.has(c.id)).length

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%', position: 'relative' }}>
      {/* Blurred backdrop */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 340,
        background: shownCover ? undefined : `linear-gradient(150deg, ${hue} 0%, color-mix(in oklab, ${hue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)`,
        overflow: 'hidden', zIndex: 0,
      }}>
        {shownCover && (
          <img src={shownCover} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'blur(28px)', transform: 'scale(1.2)',
          }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--y-bg) 5%, var(--y-ov) 55%, var(--y-ov2) 100%)' }} />
      </div>

      {/* Scrollable content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px' }}>
          <button onClick={onBack} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--y-ov2)', borderRadius: 12, border: 'none', cursor: 'pointer', color: 'var(--y-hi)' }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--y-ov2)', borderRadius: 12, border: 'none', cursor: 'pointer', color: 'var(--y-mid)' }}>
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Info block */}
        <div style={{ padding: '0 18px', display: 'flex', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 112, height: 158, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
            background: `linear-gradient(150deg, ${hue} 0%, color-mix(in oklab, ${hue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)`,
            boxShadow: '0 16px 34px rgba(0,0,0,0.5)' }}>
            {shownCover && <img src={shownCover} alt={shownTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div style={{ flex: 1, paddingTop: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--y-hi)', marginBottom: 4 }}>{shownTitle}</h1>
            {author && <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--y-mid)', marginBottom: 8 }}>{author} · {statusLabel}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {statusLabel && (
                <span style={{ background: 'var(--y-ok)', color: 'var(--y-onp)', fontSize: 10, fontWeight: 800, borderRadius: 6, padding: '3px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {statusLabel}
                </span>
              )}
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--y-hi)' }}>{displayChapterCount} EN ch</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={14} style={{ color: 'var(--y-a)', fill: 'var(--y-a)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--y-hi)' }}>{isComick ? (c?.bayesian_rating ?? '—') : '—'}</span>
              <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)' }}>· {isComick ? 'Comick' : isKakalot ? 'WeebCentral' : 'MangaDex'}</span>
            </div>
          </div>
        </div>

        {/* Genre chips */}
        {genres.length > 0 && (
          <div className="hide-scrollbar" style={{ display: 'flex', gap: 8, padding: '0 18px', overflowX: 'auto', marginBottom: 14 }}>
            {genres.filter(Boolean).map(g => (
              <span key={g} style={{ height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid var(--y-line)', background: 'var(--y-pa)', color: 'var(--y-plt)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}>{g}</span>
            ))}
          </div>
        )}

        {/* Shelf chips — the series lives on exactly one of the three shelves */}
        <div style={{ display: 'flex', gap: 10, padding: '0 18px', marginBottom: 16 }}>
          {([['reading', 'Reading'], ['want', 'Want to Read'], ['completed', 'Completed']] as [Shelf, string][]).map(([s, label]) => (
            <button key={s} onClick={() => setShelfState(id, s)} style={{
              flex: 1, height: 44, borderRadius: 11, border: 'none', cursor: 'pointer',
              background: currentShelf === s ? 'var(--y-pa)' : 'var(--y-surf)',
              color: currentShelf === s ? 'var(--y-plt)' : 'var(--y-hi)',
              fontSize: 12.5, fontWeight: 700,
            }}>{label}</button>
          ))}
        </div>

        {/* Synopsis */}
        {synopsisText && (
          <div style={{ padding: '0 18px', marginBottom: 16 }}>
            <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--y-mid)', lineHeight: 1.58, margin: 0 }}>
              {clamped ? synopsisText.slice(0, 148) + '…' : synopsisText}
            </p>
            {synopsisText.length > 148 && (
              <button onClick={() => setSynopsisExpanded(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-a)', fontSize: 12, fontWeight: 700, padding: '4px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                {synopsisExpanded ? <><ChevronUp size={13} /> Read less</> : <><ChevronDown size={13} /> Read more</>}
              </button>
            )}
          </div>
        )}

        {/* Licensed banner */}
        {isLicensed && (
          <div style={{ margin: '0 18px 16px', padding: '10px 14px', borderRadius: 12, border: '1.5px dashed var(--y-line)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExternalLink size={16} style={{ color: 'var(--y-ok)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--y-mid)', flex: 1 }}>Licensed in English</span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-plt)', fontSize: 11, fontWeight: 800 }}>Support official release</button>
          </div>
        )}

        {/* Chapter list header */}
        <div style={{ borderTop: '1px solid var(--y-line)', padding: '12px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--y-bg)', zIndex: 2 }}>
          <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--y-hi)' }}>
            Chapters — {displayChapterCount} EN
            {!isComick && readSet.size > 0 && unreadCount > 0 && (
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--y-dim)', marginLeft: 8 }}>{unreadCount} unread</span>
            )}
            {isComick && (
              <span style={{ background: 'var(--y-aa)', color: 'var(--y-a)', fontSize: 9, fontWeight: 800, borderRadius: 6, padding: '2px 6px', marginLeft: 8, textTransform: 'uppercase' }}>Comick</span>
            )}
            {showKkChapters && kkChapters.length > 0 && (
              <span style={{ background: 'var(--y-aa)', color: 'var(--y-a)', fontSize: 9, fontWeight: 800, borderRadius: 6, padding: '2px 6px', marginLeft: 8, textTransform: 'uppercase' }}>WeebCentral</span>
            )}
          </span>
          <button onClick={() => setOrder(o => o === 'desc' ? 'asc' : 'desc')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--y-dim)' }}>
            {order === 'desc' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>

        {/* Loading state */}
        {((feed.isLoading && !isComick && !isKakalot) || (isComick && (comic.isLoading || ckFeed.isLoading)) || ((isLicensed || isKakalot) && (kkSearch.isLoading || kkFeed.isLoading))) && (
          <div style={{ padding: '12px 18px' }}>
            {[0,1,2,3,4].map(i => <div key={i} style={{ height: 60, borderRadius: 10, background: 'var(--y-surf)', marginBottom: 8 }} />)}
          </div>
        )}

        {/* Comick chapters (metadata) — reading resolves via Kakalot */}
        {isComick && ckChapters.slice(0, chapterLimit).map((ch) => {
          const displayNum = ch.chap ?? '?'
          const grp = ch.group_name?.[0] ?? 'Comick'
          return (
            <button key={ch.hid} onClick={() => onRead(kkMangaId ?? undefined, 'kakalot')} style={{
              width: '100%', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              borderTop: '1px solid var(--y-line2)', textAlign: 'left',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--y-hi)', marginBottom: 3 }}>Chapter {displayNum}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--y-dim)' }}>{[ch.title, grp].filter(Boolean).join(' · ')}</div>
              </div>
            </button>
          )
        })}

        {/* MangaDex chapters */}
        {!showKkChapters && !isComick && mdChapters.slice(0, chapterLimit).map((ch, i) => {
          const num = ch.attributes.chapter ?? `${i + 1}`
          const chTitle = ch.attributes.title ?? ''
          const group = groupName(ch)
          const when = timeAgo(ch.attributes.publishAt)
          return (
            <button key={ch.id} onClick={() => onRead(id, 'mangadex', ch.id)} style={{
              width: '100%', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              borderTop: '1px solid var(--y-line2)', textAlign: 'left',
            }}>
              <div style={{ flex: 1, opacity: readSet.has(ch.id) && ch.id !== lastReadChapterId ? 0.45 : 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--y-hi)', marginBottom: 3 }}>Chapter {num}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--y-dim)' }}>{[chTitle, group, when].filter(Boolean).join(' · ')}</div>
              </div>
              <span style={{ color: 'var(--y-dim)', flexShrink: 0, width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={17} />
              </span>
            </button>
          )
        })}

        {/* WeebCentral chapters (kakalot-source series + licensed fallback) */}
        {showKkChapters && !isComick && kkChapters.slice(0, chapterLimit).map((ch) => {
          const displayNum = ch.number ?? '?'
          const isRead = readSet.has(ch.id)
          const isCurrent = ch.id === lastReadChapterId
          return (
            <div key={ch.id} style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--y-line2)' }}>
              <button onClick={() => onRead(kkMangaId ?? undefined, 'kakalot', ch.id)} style={{
                flex: 1, minHeight: 60, display: 'flex', alignItems: 'center',
                padding: '10px 0 10px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ flex: 1, opacity: isRead && !isCurrent ? 0.45 : 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: isCurrent ? 'var(--y-plt)' : 'var(--y-hi)', marginBottom: 3 }}>
                    Chapter {displayNum}
                    {isCurrent && <span style={{ fontSize: 9, fontWeight: 800, marginLeft: 8, background: 'var(--y-pa)', color: 'var(--y-plt)', borderRadius: 6, padding: '2px 6px', textTransform: 'uppercase' }}>Continue</span>}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--y-dim)' }}>{ch.title ?? 'WeebCentral'}</div>
                </div>
              </button>
              {/* read/unread toggle */}
              <button onClick={() => void toggleRead(ch.id)} aria-label={isRead ? 'Mark unread' : 'Mark read'} style={{
                width: 52, minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer',
                color: isRead ? 'var(--y-ok)' : 'var(--y-line)', fontSize: 17, fontWeight: 800,
              }}>✓</button>
            </div>
          )
        })}

        {/* Show-more for long chapter lists */}
        {displayChapterCount > chapterLimit && (
          <button onClick={() => setChapterLimit(l => l + 400)} style={{
            width: 'calc(100% - 36px)', margin: '10px 18px', height: 44, borderRadius: 11,
            background: 'var(--y-surf)', border: '1px solid var(--y-line)', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, color: 'var(--y-plt)',
          }}>
            Show more ({displayChapterCount - chapterLimit} remaining)
          </button>
        )}

        {displayChapterCount > 0 && (
          <p style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', padding: '8px 18px 100px', lineHeight: 1.55 }}>
            {isComick
              ? 'Chapter list from Comick. Reading opens the matching series on WeebCentral.'
              : showKkChapters
                ? (isLicensed ? 'Chapters sourced from WeebCentral (licensed on MangaDex).' : 'Chapters sourced from WeebCentral.')
                : 'Only English chapters with pages on MangaDex are listed.'}
          </p>
        )}

        {/* Sticky CTA */}
        <div style={{ position: 'sticky', bottom: 0, padding: '0 18px 20px', background: 'linear-gradient(to top, var(--y-bg) 45%, transparent)', zIndex: 3 }}>
          <button
            disabled={(isComick || showKkChapters) && !kkMangaId}
            onClick={() => {
              if (isComick || showKkChapters) {
                onRead(kkMangaId ?? undefined, 'kakalot')
              } else {
                onRead(id, 'mangadex', lastMdChapter?.id ?? firstMdChapter?.id)
              }
            }} style={{
            width: '100%', height: 52, borderRadius: 14,
            background: (isComick || showKkChapters) && !kkMangaId ? 'var(--y-surf)' : 'var(--y-p)',
            color: (isComick || showKkChapters) && !kkMangaId ? 'var(--y-dim)' : 'var(--y-onp)',
            fontSize: 15, fontWeight: 700, border: 'none', cursor: (isComick || showKkChapters) && !kkMangaId ? 'default' : 'pointer',
          }}>
            {isComick
              ? (kkMangaId ? 'Read on WeebCentral' : (kkSearch.isLoading ? 'Finding readable source…' : 'No readable source found'))
              : showKkChapters
                ? (continueKk ? `Continue · Ch. ${continueKk.number ?? '?'}` : 'Start reading · Ch. 1')
                : (continueMd ? `Continue · Ch. ${continueMd.attributes.chapter ?? '?'}` : 'Start reading · Ch. 1')
            }
          </button>
        </div>
      </div>
    </div>
  )
}
