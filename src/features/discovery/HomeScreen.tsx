import { Bell, Search as SearchIcon, ChevronRight } from 'lucide-react'
import { usePopular, useLatestUpdates, mangaEnTitle, mangaCoverUrl, type MDManga } from '../../lib/mangadex/queries'
import { coverHue } from '../../components/CoverGradient'
import type { SeriesSource } from '../../App'

const PROXY_BASE = (import.meta.env?.VITE_IMAGE_PROXY as string | undefined) ?? 'http://localhost:8787'
function proxyCover(u: string) {
  const p = new URL('/img', PROXY_BASE); p.searchParams.set('u', u); return p.toString()
}

function CoverImg({ manga, width, height, radius = 14 }: { manga: MDManga; width: number; height: number; radius?: number }) {
  const raw = mangaCoverUrl(manga)
  const cover = raw ? proxyCover(raw) : null
  const hue = coverHue(manga.id)
  return (
    <div style={{ width, height, borderRadius: radius, overflow: 'hidden', flexShrink: 0, position: 'relative',
      background: `linear-gradient(150deg, ${hue} 0%, color-mix(in oklab, ${hue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)` }}>
      {cover && <img src={cover} alt={mangaEnTitle(manga)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />}
    </div>
  )
}

function RailCard({ manga, onOpen }: { manga: MDManga; onOpen: (id: string, src: SeriesSource) => void }) {
  const title = mangaEnTitle(manga)
  return (
    <button onClick={() => onOpen(manga.id, 'mangadex')} style={{ width: 110, flexShrink: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <CoverImg manga={manga} width={110} height={152} radius={14} />
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--y-text)', marginTop: 6, lineHeight: 1.35,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{title}</div>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--y-dim)', marginTop: 2 }}>{manga.attributes.status}</div>
    </button>
  )
}

function Rail({ title, sub, items, loading, onOpen }: {
  title: string; sub: string; items: MDManga[]; loading: boolean;
  onOpen: (id: string, src: SeriesSource) => void
}) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 18px', marginBottom: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--y-hi)' }}>{title}</span>
        <button style={{ fontSize: 11, fontWeight: 700, color: 'var(--y-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
          See all <ChevronRight size={13} />
        </button>
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', padding: '0 18px', marginBottom: 10 }}>{sub}</div>
      <div className="hide-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 18px 4px' }}>
        {loading && [0,1,2,3,4].map(i => (
          <div key={i} style={{ width: 110, height: 152, borderRadius: 14, background: 'var(--y-surf)', flexShrink: 0, animation: 'pulse 1.5s ease infinite' }} />
        ))}
        {items.map(m => <RailCard key={m.id} manga={m} onOpen={onOpen} />)}
      </div>
    </section>
  )
}

export default function HomeScreen({
  onOpen,
  onUnread,
}: {
  onOpen: (id: string, source: SeriesSource) => void
  onUnread: () => void
}) {
  const popular = usePopular()
  const latest = useLatestUpdates()
  const hero = popular.data?.data?.[0]
  const heroTitle = hero ? mangaEnTitle(hero) : ''
  const heroHue = hero ? coverHue(hero.id) : '#17B57E'
  const heroCoverRaw = hero ? mangaCoverUrl(hero) : null
  const heroCover = heroCoverRaw ? proxyCover(heroCoverRaw) : null

  return (
    <div style={{ background: 'var(--y-bg)', minHeight: '100%' }}>
      {/* Header 58px */}
      <header style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--y-hi)' }}>YOMU</span>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--y-a)', marginBottom: 2 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={onUnread} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-mid)' }}>
            <Bell size={20} />
          </button>
          <button style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--y-mid)' }}>
            <SearchIcon size={20} />
          </button>
          <button style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(140deg, var(--y-p), var(--y-a))', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--y-onp)', fontSize: 14, fontWeight: 700 }}>
            Y
          </button>
        </div>
      </header>

      {/* Hero 268px */}
      {hero && (
        <div style={{ height: 268, position: 'relative', overflow: 'hidden', marginBottom: 28 }}>
          {/* backdrop cover */}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(150deg, ${heroHue} 0%, color-mix(in oklab, ${heroHue} 36%, var(--y-bg)) 58%, var(--y-bg) 100%)` }} />
          {heroCover && <img src={heroCover} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />}
          {/* scrim */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--y-bg) 3%, var(--y-ov) 40%, transparent 76%)' }} />
          {/* content */}
          <div style={{ position: 'absolute', bottom: 0, left: 18, right: 18, paddingBottom: 18 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <span style={{ background: 'var(--y-aa)', color: 'var(--y-a)', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', borderRadius: 6, padding: '3px 7px', textTransform: 'uppercase' }}>Popular Now</span>
              <span style={{ background: 'var(--y-ov2)', color: 'var(--y-mid)', fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', borderRadius: 6, padding: '3px 7px', textTransform: 'uppercase' }}>Manga · EN</span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--y-hi)', marginBottom: 6, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{heroTitle}</h2>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--y-mid)', marginBottom: 14 }}>Action · Fantasy</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => onOpen(hero.id, 'mangadex')} style={{
                height: 46, flex: 1.2, borderRadius: 13, background: 'var(--y-p)', color: 'var(--y-onp)',
                fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 13 }}>▶</span> Read now
              </button>
              <button onClick={() => onOpen(hero.id, 'mangadex')} style={{
                height: 46, flex: 1, borderRadius: 13, background: 'transparent',
                border: '1.5px solid var(--y-line)', color: 'var(--y-hi)',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Details</button>
            </div>
          </div>
        </div>
      )}

      {/* Rails */}
      <Rail title="Popular / Trending" sub="MangaDex follows + rating" items={popular.data?.data ?? []} loading={popular.isLoading} onOpen={onOpen} />
      <Rail title="Latest Updates" sub="New English chapters, newest first" items={latest.data?.data ?? []} loading={latest.isLoading} onOpen={onOpen} />
      <Rail title="Continue Reading" sub="Exact page resume · synced" items={[]} loading={false} onOpen={onOpen} />
      <Rail title="Because you read Action" sub="From your most-read genres" items={popular.data?.data?.slice(5, 10) ?? []} loading={popular.isLoading} onOpen={onOpen} />

      {/* Footer */}
      <p style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--y-dim)', textAlign: 'center', padding: '8px 18px 24px', lineHeight: 1.55 }}>
        Metadata and chapters from MangaDex · English only. Personal-use client.
      </p>
    </div>
  )
}
