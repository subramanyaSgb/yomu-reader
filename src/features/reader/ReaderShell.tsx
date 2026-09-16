// Reader shell (FR-6): loads chapter list, picks reading mode, hosts the active renderer.
// Supports MangaDex (API) and Mangakakalot (scraper) sources.
// Auto-fallback: if a MangaDex series has no readable chapters (all external/licensed),
// searches Kakalot by title and uses the first match automatically.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useChapterFeed, mangaEnTitle } from '../../lib/mangadex/queries'
import { useQuery } from '@tanstack/react-query'
import { mdGet } from '../../lib/mangadex/client'
import { useKakalotChapters, useKakalotSearch } from '../../lib/kakalot/queries'
import { makeProgressSaver, restoreProgress } from './resume'
import type { ScrollAnchor } from './scrollAnchor'
import { trackChapterRead } from '../stats/statsRepo'
import { useWakeLock } from '../settings/useWakeLock'
import {
  resolveChapters,
  inferPreferredGroup,
  type RawChapter,
  type ResolvedChapter,
} from './versionResolver'
import VerticalScrollRenderer, { type ChapterRef } from './VerticalScrollRenderer'
import PagedRenderer from './PagedRenderer'
import ReaderControls from './ReaderControls'
import VersionSwitchSheet from './VersionSwitchSheet'
import { useReaderMemory } from './useReaderMemory'
import type { SeriesType, ReadMode } from '../../lib/db/schema'
import type { SeriesSource } from '../../App'
import type { MDList, MDManga } from '../../lib/mangadex/queries'

interface Props {
  seriesId: string
  seriesSource: SeriesSource
  seriesType: SeriesType
  startChapterId?: string
  onClose?: () => void
}

function defaultMode(type: SeriesType): ReadMode {
  return type === 'manga' ? 'paged' : 'scroll'
}

export default function ReaderShell({ seriesId, seriesSource, seriesType, startChapterId, onClose }: Props) {
  const { mem, update } = useReaderMemory(seriesId)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [sheet, setSheet] = useState<'controls' | 'versions' | 'chapters' | null>(null)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [hudVisible, setHudVisible] = useState(true)
  const [progressPct, setProgressPct] = useState(0)
  const [autoScrollOn, setAutoScrollOn] = useState(false)
  // Exact-position resume (comix-style): restored once from saved progress.
  const [initialAnchor, setInitialAnchor] = useState<ScrollAnchor | null>(null)
  const [initialPage, setInitialPage] = useState(0)

  // Auto-hide the HUD after a few seconds (comix-style immersive reading).
  useEffect(() => {
    if (!hudVisible) return
    const t = window.setTimeout(() => setHudVisible(false), 3000)
    return () => window.clearTimeout(t)
  }, [hudVisible, chapterIndex])

  useWakeLock(true)

  // Always fetch MangaDex chapters when source is mangadex.
  const mdFeed = useChapterFeed(seriesSource === 'mangadex' ? seriesId : undefined)

  // Fetch the series title so we can search Kakalot if MD has no readable chapters.
  const mdMeta = useQuery({
    queryKey: ['md', 'meta', seriesId],
    enabled: seriesSource === 'mangadex',
    staleTime: 30 * 60 * 1000,
    queryFn: () => mdGet<MDList<MDManga>>('/manga', {
      ids: [seriesId],
      limit: 1,
      'includes[]': ['cover_art'],
    }),
  })

  // MangaDex readable chapters = those with pages hosted on MD (not external-only).
  const mdReadableChapters = useMemo(() => {
    if (!mdFeed.data) return null
    return mdFeed.data.data.filter(
      (c) => !c.attributes.externalUrl && c.attributes.pages > 0
    )
  }, [mdFeed.data])

  // If MD has no readable chapters, fall back to Kakalot via title search.
  const mdHasNoReadable = mdFeed.data != null && mdReadableChapters?.length === 0
  const seriesTitle = mdMeta.data?.data?.[0] ? mangaEnTitle(mdMeta.data.data[0]) : ''
  const kkFallbackSearch = useKakalotSearch(mdHasNoReadable && seriesTitle ? seriesTitle : '')
  const kkFallbackId = kkFallbackSearch.data?.[0]?.id ?? null

  // Kakalot chapters — either direct (source=kakalot) or fallback from MD.
  const kkChapterId =
    seriesSource === 'kakalot' ? seriesId :
    (mdHasNoReadable && kkFallbackId ? kkFallbackId : undefined)
  const kkFeed = useKakalotChapters(kkChapterId)

  // Determine active source: prefer MD if it has readable chapters, else Kakalot.
  const activeSource: SeriesSource =
    seriesSource === 'kakalot' ? 'kakalot' :
    (mdHasNoReadable ? 'kakalot' : 'mangadex')

  const isLoading =
    activeSource === 'mangadex' ? mdFeed.isLoading :
    (kkFeed.isLoading || kkFallbackSearch.isLoading || mdFeed.isLoading)
  const isError = activeSource === 'mangadex' ? mdFeed.isError : kkFeed.isError

  // Derive the real series type from source metadata so manhwa/manhua default to
  // long-strip scroll: WeebCentral reports kind directly; MangaDex via originalLanguage.
  const kkKind = kkFeed.data?.kind
  const mdLang = mdMeta.data?.data?.[0]?.attributes?.originalLanguage
  const derivedType: SeriesType | null =
    activeSource === 'kakalot'
      ? (kkKind === 'manhwa' || kkKind === 'oel' ? 'manhwa'  // oel = English webtoon, long-strip
        : kkKind === 'manhua' ? 'manhua' : kkKind ? 'manga' : null)
      : (mdLang === 'ko' ? 'manhwa' : mdLang?.startsWith('zh') ? 'manhua' : mdLang === 'ja' ? 'manga' : null)
  const mode = mem.mode ?? defaultMode(derivedType ?? seriesType)

  // Stats tracking
  const prevChapterRef = useRef<string | null>(null)
  const chapterRefsRef = useRef<ChapterRef[]>([])
  useEffect(() => {
    const id = chapterRefsRef.current?.[chapterIndex]?.id
    if (id && prevChapterRef.current && prevChapterRef.current !== id) {
      void trackChapterRead(60, [])
    }
    if (id) prevChapterRef.current = id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex])

  const saver = useRef(makeProgressSaver(seriesId))
  const [restored, setRestored] = useState(false)
  useEffect(() => {
    saver.current = makeProgressSaver(seriesId)
    setRestored(false)
  }, [seriesId])

  // Build resolved chapter list.
  const resolved: ResolvedChapter[] = useMemo(() => {
    if (activeSource === 'mangadex' && mdReadableChapters) {
      const raw: RawChapter[] = mdReadableChapters.map((c) => ({
        id: c.id,
        number: c.attributes.chapter,
        group: c.relationships.find((r) => r.type === 'scanlation_group')?.id ?? 'unknown',
        likes: 0,
        pages: c.attributes.pages ?? 0,
        publishAt: c.attributes.publishAt,
      }))
      return resolveChapters(raw, inferPreferredGroup(raw))
    }
    if (activeSource === 'kakalot') {
      return (kkFeed.data?.chapters ?? []).map((c) => ({
        number: c.number,
        selectedVersionId: c.id,
        versions: [{ id: c.id, group: 'WeebCentral', likes: 0, pages: 0 }],
      } as ResolvedChapter))
    }
    return []
  }, [activeSource, mdReadableChapters, kkFeed.data])

  const chapterRefs: ChapterRef[] = resolved.map((c) => ({
    id: overrides[c.number ?? '__null__'] ?? c.selectedVersionId,
    number: c.number,
    source: activeSource,
  }))
  chapterRefsRef.current = chapterRefs

  const currentResolved = resolved[chapterIndex]

  useEffect(() => {
    if (restored || chapterRefs.length === 0) return
    // Explicit start chapter (user tapped a specific chapter) beats saved progress.
    if (startChapterId) {
      const idx = chapterRefs.findIndex((c) => c.id === startChapterId)
      if (idx >= 0) {
        setChapterIndex(idx)
        setRestored(true)
        return
      }
    }
    let alive = true
    restoreProgress(seriesId).then((p) => {
      if (!alive || !p) { setRestored(true); return }
      const idx = chapterRefs.findIndex((c) => c.id === p.lastChapterId)
      if (idx >= 0) {
        setChapterIndex(idx)
        // Exact position within the chapter (FR-18): scroll anchor or page index.
        if (p.position?.kind === 'scroll') {
          setInitialAnchor({ imageIndex: p.position.imageIndex, offsetPct: p.position.offsetPct })
        } else if (p.position?.kind === 'paged') {
          setInitialPage(p.position.pageIndex)
        }
      }
      setRestored(true)
    })
    return () => { alive = false }
  }, [restored, chapterRefs, seriesId, startChapterId])

  // Flush pending progress when the app is backgrounded/closed or the reader unmounts.
  useEffect(() => {
    const flush = () => saver.current.flush()
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      flush()
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  // Baseline save when NAVIGATING to a different chapter (start of it). Never on the
  // first (restored) chapter — that would overwrite the saved exact position with 0.
  const lastSavedChapter = useRef<string | null>(null)
  useEffect(() => {
    if (!restored) return
    const ref = chapterRefs[chapterIndex]
    if (!ref || lastSavedChapter.current === ref.id) return
    const isFirst = lastSavedChapter.current === null
    lastSavedChapter.current = ref.id
    if (isFirst) return
    const pos =
      mode === 'paged'
        ? ({ kind: 'paged', pageIndex: 0 } as const)
        : ({ kind: 'scroll', imageIndex: 0, offsetPct: 0 } as const)
    saver.current(ref.id, mode, pos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex, restored, chapterRefs])

  // Still waiting for auto-fallback to resolve.
  if (isLoading || (mdHasNoReadable && kkFallbackSearch.isLoading)) {
    return <Centered>
      {mdHasNoReadable ? 'Not on MangaDex — searching WeebCentral…' : 'Loading chapters…'}
    </Centered>
  }
  if (isError) return <Centered>Source unreachable — retry.</Centered>
  if (chapterRefs.length === 0) {
    return <Centered>No readable chapters found on any source.</Centered>
  }

  const sourceLabel = activeSource === 'kakalot' ? ' (via WeebCentral)' : ''

  const currentRef = chapterRefs[chapterIndex]
  const quality = mem.quality ?? 'source'

  return (
    <div style={{ position: 'relative', height: '100%', background: mem.gapColor || 'var(--y-black)' }}>
      {/* Top HUD */}
      {hudVisible && (
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)',
      }}>
        <button onClick={onClose} style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          ←
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {sourceLabel && (
            <span style={{ background: 'rgba(242,193,78,0.2)', color: 'var(--y-a)', fontSize: 9.5, fontWeight: 800, borderRadius: 20, padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              WeebCentral
            </span>
          )}
          <button onClick={() => setSheet('chapters')} style={{ height: 36, padding: '0 12px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)', fontSize: 12, fontWeight: 700 }}>
            Ch. {currentRef?.number ?? '?'} ▾
          </button>
          {activeSource === 'mangadex' && (
            <button onClick={() => setSheet('versions')} style={{ height: 36, padding: '0 12px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)', fontSize: 12, fontWeight: 700 }}>
              Version
            </button>
          )}
          <button onClick={() => setSheet('controls')} style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            ⚙
          </button>
        </div>
      </div>
      )}

      {mode === 'scroll' ? (
        <VerticalScrollRenderer
          chapters={chapterRefs}
          startIndex={chapterIndex}
          quality={quality}
          initialAnchor={initialAnchor}
          onChapterChange={setChapterIndex}
          onProgressChange={setProgressPct}
          onAnchorChange={(a) => {
            const ref = chapterRefsRef.current[chapterIndex]
            if (ref) saver.current(ref.id, mode, { kind: 'scroll', imageIndex: a.imageIndex, offsetPct: a.offsetPct })
          }}
          onTap={() => setHudVisible(v => !v)}
          autoScroll={autoScrollOn}
          autoScrollSpeed={mem.autoSpeed ?? 2}
        />
      ) : (
        <PagedRenderer
          chapters={chapterRefs}
          chapterIndex={chapterIndex}
          onChapterChange={setChapterIndex}
          rtl={mem.rtl}
          turnOverride={mem.turn}
          gapColor={mem.gapColor}
          quality={quality}
          initialPage={initialPage}
          onPageChange={(p) => {
            const ref = chapterRefsRef.current[chapterIndex]
            if (ref) saver.current(ref.id, mode, { kind: 'paged', pageIndex: p })
          }}
        />
      )}

      {/* Bottom HUD: prev / progress / auto-scroll / next */}
      {hudVisible && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '18px 14px 22px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)',
        }}>
          <button
            disabled={chapterIndex === 0}
            onClick={() => setChapterIndex(i => Math.max(0, i - 1))}
            style={{ height: 40, padding: '0 16px', borderRadius: 20, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', color: chapterIndex === 0 ? 'rgba(255,255,255,0.3)' : '#fff', backdropFilter: 'blur(8px)', fontSize: 12.5, fontWeight: 700 }}>
            ‹ Prev
          </button>
          <span style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '9px 14px', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' }}>
            Ch. {currentRef?.number ?? '?'}{mode === 'scroll' ? ` · ${progressPct}%` : ''} · {chapterIndex + 1}/{chapterRefs.length}
          </span>
          {mode === 'scroll' && (
            <button
              onClick={() => setAutoScrollOn(a => !a)}
              style={{ height: 40, padding: '0 14px', borderRadius: 20, background: autoScrollOn ? 'var(--y-p)' : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', color: autoScrollOn ? 'var(--y-onp)' : '#fff', backdropFilter: 'blur(8px)', fontSize: 12.5, fontWeight: 700 }}>
              {autoScrollOn ? '⏸ Auto' : '▶ Auto'}
            </button>
          )}
          <button
            disabled={chapterIndex >= chapterRefs.length - 1}
            onClick={() => setChapterIndex(i => Math.min(chapterRefs.length - 1, i + 1))}
            style={{ height: 40, padding: '0 16px', borderRadius: 20, background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', color: chapterIndex >= chapterRefs.length - 1 ? 'rgba(255,255,255,0.3)' : '#fff', backdropFilter: 'blur(8px)', fontSize: 12.5, fontWeight: 700 }}>
            Next ›
          </button>
        </div>
      )}

      {mem.brightness > 0 && (
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-black"
          style={{ opacity: mem.brightness }}
        />
      )}

      {sheet === 'controls' && (
        <ReaderControls mem={mem} update={update} onClose={() => setSheet(null)} />
      )}
      {sheet === 'chapters' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.6)' }} onClick={() => setSheet(null)}>
          <div style={{ width: '100%', maxHeight: '70%', overflowY: 'auto', borderRadius: '20px 20px 0 0', background: 'var(--y-surf)', border: '1px solid var(--y-line)', padding: '20px 0 24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--y-hi)', padding: '0 18px 14px' }}>Chapters — {chapterRefs.length}</div>
            {chapterRefs.map((c, i) => (
              <button key={c.id} onClick={() => { setChapterIndex(i); setSheet(null) }} style={{
                width: '100%', height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 18px', background: i === chapterIndex ? 'var(--y-pa)' : 'none', border: 'none', cursor: 'pointer',
              }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: i === chapterIndex ? 'var(--y-plt)' : 'var(--y-hi)' }}>Chapter {c.number ?? '?'}</span>
                {i === chapterIndex && <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--y-plt)' }}>READING</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      {sheet === 'versions' && currentResolved && (
        <VersionSwitchSheet
          versions={currentResolved.versions}
          selectedId={chapterRefs[chapterIndex].id}
          onPick={(vid) => {
            setOverrides((o) => ({ ...o, [currentResolved.number ?? '__null__']: vid }))
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center bg-black text-neutral-400 text-center px-8">
      {children}
    </div>
  )
}
