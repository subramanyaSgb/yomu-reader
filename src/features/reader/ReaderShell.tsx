// Reader shell (FR-6): loads a series' resolved chapters, picks reading mode by content type,
// hosts the active renderer, controls, version switch, brightness overlay, and reader memory.

import { useMemo, useState } from 'react'
import { useChapterFeed } from '../../lib/mangadex/queries'
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

interface Props {
  seriesId: string
  seriesType: SeriesType
  onClose?: () => void
}

function defaultMode(type: SeriesType): ReadMode {
  return type === 'manga' ? 'paged' : 'scroll'
}

export default function ReaderShell({ seriesId, seriesType, onClose }: Props) {
  const feed = useChapterFeed(seriesId)
  const { mem, update } = useReaderMemory(seriesId)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [sheet, setSheet] = useState<'controls' | 'versions' | null>(null)
  // Per-chapter manual version overrides (remembered in-session; persisted in Phase 2).
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const mode = mem.mode ?? defaultMode(seriesType)

  const resolved: ResolvedChapter[] = useMemo(() => {
    if (!feed.data) return []
    const raw: RawChapter[] = feed.data.data.map((c) => ({
      id: c.id,
      number: c.attributes.chapter,
      group: c.relationships.find((r) => r.type === 'scanlation_group')?.id ?? 'unknown',
      likes: 0,
      pages: c.attributes.pages ?? 0,
      publishAt: c.attributes.publishAt,
    }))
    return resolveChapters(raw, inferPreferredGroup(raw))
  }, [feed.data])

  // Apply per-chapter overrides to selected version.
  const chapterRefs: ChapterRef[] = resolved.map((c) => ({
    id: overrides[c.number ?? '__null__'] ?? c.selectedVersionId,
    number: c.number,
  }))

  const currentResolved = resolved[chapterIndex]

  if (feed.isLoading) return <Centered>Loading chapters…</Centered>
  if (feed.isError) return <Centered>MangaDex unreachable — retry.</Centered>
  if (chapterRefs.length === 0) return <Centered>No English chapters.</Centered>

  return (
    <div className="relative h-full bg-black" style={{ background: mem.gapColor }}>
      {/* Top HUD */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-3">
        <button onClick={onClose} className="rounded-full bg-black/60 px-3 py-1 text-sm text-white">
          ← Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setSheet('versions')}
            className="rounded-full bg-black/60 px-3 py-1 text-sm text-white"
          >
            Version
          </button>
          <button
            onClick={() => setSheet('controls')}
            className="rounded-full bg-black/60 px-3 py-1 text-sm text-white"
          >
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

      {/* Brightness dim overlay (FR-11 AC4) */}
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
    <div className="flex h-full items-center justify-center bg-black text-neutral-400">
      {children}
    </div>
  )
}
