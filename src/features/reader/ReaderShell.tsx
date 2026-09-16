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
  onClose?: () => void
}

function defaultMode(type: SeriesType): ReadMode {
  return type === 'manga' ? 'paged' : 'scroll'
}

export default function ReaderShell({ seriesId, seriesSource, seriesType, onClose }: Props) {
  const { mem, update } = useReaderMemory(seriesId)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [sheet, setSheet] = useState<'controls' | 'versions' | null>(null)
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const mode = mem.mode ?? defaultMode(seriesType)
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
        versions: [{ id: c.id, group: 'Mangapill', likes: 0, pages: 0 }],
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
    let alive = true
    restoreProgress(seriesId).then((p) => {
      if (!alive || !p) { setRestored(true); return }
      const idx = chapterRefs.findIndex((c) => c.id === p.lastChapterId)
      if (idx >= 0) setChapterIndex(idx)
      setRestored(true)
    })
    return () => { alive = false }
  }, [restored, chapterRefs, seriesId])

  useEffect(() => {
    const ref = chapterRefs[chapterIndex]
    if (!ref) return
    const pos =
      mode === 'paged'
        ? ({ kind: 'paged', pageIndex: 0 } as const)
        : ({ kind: 'scroll', imageIndex: 0, offsetPct: 0 } as const)
    saver.current(ref.id, mode, pos)
    const flush = () => saver.current.flush()
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      flush()
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [chapterIndex, mode, chapterRefs])

  // Still waiting for auto-fallback to resolve.
  if (isLoading || (mdHasNoReadable && kkFallbackSearch.isLoading)) {
    return <Centered>
      {mdHasNoReadable ? 'Not on MangaDex — searching Mangapill…' : 'Loading chapters…'}
    </Centered>
  }
  if (isError) return <Centered>Source unreachable — retry.</Centered>
  if (chapterRefs.length === 0) {
    return <Centered>No readable chapters found on any source.</Centered>
  }

  const sourceLabel = activeSource === 'kakalot' ? ' (via Mangapill)' : ''

  return (
    <div style={{ position: 'relative', height: '100%', background: mem.gapColor || 'var(--y-black)' }}>
      {/* Top HUD */}
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
              Mangapill
            </span>
          )}
          <button onClick={() => setSheet('versions')} style={{ height: 36, padding: '0 12px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)', fontSize: 12, fontWeight: 700 }}>
            Version
          </button>
          <button onClick={() => setSheet('controls')} style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            ⚙
          </button>
        </div>
      </div>

      {mode === 'scroll' ? (
        <VerticalScrollRenderer
          chapters={chapterRefs}
          startIndex={chapterIndex}
          onChapterChange={setChapterIndex}
        />
      ) : (
        <PagedRenderer
          chapters={chapterRefs}
          chapterIndex={chapterIndex}
          onChapterChange={setChapterIndex}
          rtl={mem.rtl}
          turnOverride={mem.turn}
          gapColor={mem.gapColor}
        />
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
