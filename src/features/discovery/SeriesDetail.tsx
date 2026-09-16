import { useMemo, useState } from 'react'
import {
  ArrowLeft, Bell, Download, Star, BookOpen, ChevronDown, ExternalLink, ChevronUp
} from 'lucide-react'
import {
  useManga, useChapterFeed, mangaEnTitle, mangaCoverUrl,
  type MDChapter,
} from '../../lib/mangadex/queries'
import { useKakalotSearch, useKakalotChapters } from '../../lib/kakalot/queries'
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
  onRead: (readId?: string, readSource?: SeriesSource) => void
}

export default function SeriesDetail({ id, source, onBack, onRead }: Props) {
  const manga = useManga(source === 'mangadex' ? id : undefined)
  const feed = useChapterFeed(source === 'mangadex' ? id : undefined)
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [synopsisExpanded, setSynopsisExpanded] = useState(false)
  const [following, setFollowing] = useState(false)

  const m = manga.data?.data
  const title = m ? mangaEnTitle(m) : '…'
  const hue = coverHue(id)
  const cover = m ? mangaCoverUrl(m) : null

  const mdChapters = useMemo(() => {
    if (!feed.data) return []
    const readable = feed.data.data.filter(c => !c.attributes.externalUrl && c.attributes.pages > 0)
    return order === 'desc' ? [...readable].reverse() : readable
  }, [feed.data, order])

  const isLicensed = feed.data != null && mdChapters.length === 0 && source === 'mangadex'

  // Auto-fetch Kakalot for licensed series
  const kkSearch = useKakalotSearch(isLicensed && title && title !== '…' ? title : '')
  const kkMangaId = kkSearch.data?.[0]?.id ?? null
  const kkFeed = useKakalotChapters(kkMangaId ?? '')
  const kkChapters = kkFeed.data?.chapters ?? []

  const displayChapterCount = isLicensed ? kkChapters.length : mdChapters.length

  const synopsisText = m?.attributes.description?.en ?? ''
  const clamped = !synopsisExpanded && synopsisText.length > 148

  const firstMdChapter = mdChapters[mdChapters.length - 1]
  const lastMdChapter = mdChapters[0]
  const lastKkChapter = kkChapters[0]

  const author = m?.relationships?.find(r => r.type === 'author')?.attributes?.name ?? ''
  const genres: string[] = (m?.attributes.tags ?? [])
    .filter(t => t.attributes?.group === 'genre')
    .map(t => t.attributes?.name?.en ?? '')
    .filter(Boolean)

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%', position: 'relative' }}>
      {/* Blurred backdrop */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 340,
        background: cover ? undefined : `linear-gradient(150deg, ${hue} 0%, color-mix(in oklab, ${hue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)`,
        overflow: 'hidden', zIndex: 0,
      }}>
        {cover && (
          <img src={cover} alt="" style={{
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
            <button style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--y-ov2)', borderRadius: 12, border: 'none', cursor: 'pointer', color: following ? 'var(--y-a)' : 'var(--y-mid)' }}>
              <Bell size={18} />
            </button>
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
            {cover && <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div style={{ flex: 1, paddingTop: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--y-hi)', marginBottom: 4 }}>{title}</h1>
            {author && <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--y-mid)', marginBottom: 8 }}>{author} · {m?.attributes.status}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {m?.attributes.status && (
                <span style={{ background: 'var(--y-ok)', color: 'var(--y-onp)', fontSize: 10, fontWeight: 800, borderRadius: 6, padding: '3px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {m.attributes.status}
                </span>
              )}
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--y-hi)' }}>{displayChapterCount} EN ch</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={14} style={{ color: 'var(--y-a)', fill: 'var(--y-a)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--y-hi)' }}>—</span>
              <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)' }}>· MangaDex</span>
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

        {/* Action row */}
        <div style={{ display: 'flex', gap: 10, padding: '0 18px', marginBottom: 16 }}>
          <button onClick={() => setFollowing(f => !f)} style={{
            flex: 1.2, height: 44, borderRadius: 11, border: 'none', cursor: 'pointer',
            background: following ? 'var(--y-pa)' : 'var(--y-surf)',
            color: following ? 'var(--y-plt)' : 'var(--y-hi)',
            fontSize: 13.5, fontWeight: 700,
          }}>{following ? 'Following' : 'Follow'}</button>
          <button style={{ flex: 1, height: 44, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'var(--y-surf)', color: 'var(--y-hi)', fontSize: 13, fontWeight: 600 }}>Reading</button>
          <button style={{ width: 44, height: 44, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'var(--y-surf)', color: 'var(--y-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={18} />
          </button>
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
            Chapters — {isLicensed ? kkChapters.length : mdChapters.length} EN
            {isLicensed && kkChapters.length > 0 && (
              <span style={{ background: 'var(--y-aa)', color: 'var(--y-a)', fontSize: 9, fontWeight: 800, borderRadius: 6, padding: '2px 6px', marginLeft: 8, textTransform: 'uppercase' }}>Kakalot</span>
            )}
          </span>
          <button onClick={() => setOrder(o => o === 'desc' ? 'asc' : 'desc')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--y-dim)' }}>
            {order === 'desc' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>

        {/* Loading state */}
        {(feed.isLoading || (isLicensed && (kkSearch.isLoading || kkFeed.isLoading))) && (
          <div style={{ padding: '12px 18px' }}>
            {[0,1,2,3,4].map(i => <div key={i} style={{ height: 60, borderRadius: 10, background: 'var(--y-surf)', marginBottom: 8 }} />)}
          </div>
        )}

        {/* MangaDex chapters */}
        {!isLicensed && mdChapters.map((ch, i) => {
          const num = ch.attributes.chapter ?? `${i + 1}`
          const chTitle = ch.attributes.title ?? ''
          const group = groupName(ch)
          const when = timeAgo(ch.attributes.publishAt)
          return (
            <button key={ch.id} onClick={() => onRead(ch.id)} style={{
              width: '100%', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              borderTop: '1px solid var(--y-line2)', textAlign: 'left',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--y-hi)', marginBottom: 3 }}>Chapter {num}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--y-dim)' }}>{[chTitle, group, when].filter(Boolean).join(' · ')}</div>
              </div>
              <span style={{ color: 'var(--y-dim)', flexShrink: 0, width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={17} />
              </span>
            </button>
          )
        })}

        {/* Kakalot chapters (for licensed series) */}
        {isLicensed && kkChapters.map((ch) => {
          const displayNum = ch.number ?? '?'
          return (
            <button key={ch.id} onClick={() => onRead(kkMangaId ?? undefined, 'kakalot')} style={{
              width: '100%', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
              borderTop: '1px solid var(--y-line2)', textAlign: 'left',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--y-hi)', marginBottom: 3 }}>Chapter {displayNum}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--y-dim)' }}>{ch.title ?? 'Mangakakalot'}</div>
              </div>
            </button>
          )
        })}

        {(isLicensed ? kkChapters.length : mdChapters.length) > 0 && (
          <p style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', padding: '8px 18px 100px', lineHeight: 1.55 }}>
            {isLicensed ? 'Chapters sourced from Mangakakalot (licensed on MangaDex).' : 'Only English chapters with pages on MangaDex are listed.'}
          </p>
        )}

        {/* Sticky CTA */}
        <div style={{ position: 'sticky', bottom: 0, padding: '0 18px 20px', background: 'linear-gradient(to top, var(--y-bg) 45%, transparent)', zIndex: 3 }}>
          <button onClick={() => {
            if (isLicensed) {
              onRead(kkMangaId ?? undefined, 'kakalot')
            } else {
              onRead(lastMdChapter?.id ?? firstMdChapter?.id, 'mangadex')
            }
          }} style={{
            width: '100%', height: 52, borderRadius: 14, background: 'var(--y-p)', color: 'var(--y-onp)',
            fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
          }}>
            {isLicensed
              ? (lastKkChapter ? `Continue · Ch. ${lastKkChapter.number ?? '1'}` : 'Start reading · Ch. 1')
              : (lastMdChapter ? `Continue · Ch. ${lastMdChapter.attributes.chapter ?? '1'}` : 'Start reading · Ch. 1')
            }
          </button>
        </div>
      </div>
    </div>
  )
}
