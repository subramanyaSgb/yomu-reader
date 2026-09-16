// Reader shell (FR-6): loads a series' resolved chapters, picks the reading mode by content
// type (manhwa/manhua -> scroll, manga -> paged RTL), and hosts the active renderer + HUD.
// Version switch + full controls land in Task 6; paged renderer in Task 5.

import { useMemo, useState } from 'react'
import { useChapterFeed } from '../../lib/mangadex/queries'
import {
  resolveChapters,
  inferPreferredGroup,
  type RawChapter,
} from './versionResolver'
import VerticalScrollRenderer, { type ChapterRef } from './VerticalScrollRenderer'
import PagedRenderer from './PagedRenderer'
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
  const [chapterIndex, setChapterIndex] = useState(0)
  const [mode] = useState<ReadMode>(defaultMode(seriesType))

  const resolved = useMemo(() => {
    if (!feed.data) return []
    const raw: RawChapter[] = feed.data.data.map((c) => ({
      id: c.id,
      number: c.attributes.chapter,
      group:
        c.relationships.find((r) => r.type === 'scanlation_group')?.id ?? 'unknown',
      likes: 0, // MangaDex feed doesn't expose likes directly; refined in Phase 3+
      pages: c.attributes.pages ?? 0,
      publishAt: c.attributes.publishAt,
    }))
    return resolveChapters(raw, inferPreferredGroup(raw))
  }, [feed.data])

  const chapterRefs: ChapterRef[] = resolved.map((c) => ({
    id: c.selectedVersionId,
    number: c.number,
  }))

  if (feed.isLoading) return <Centered>Loading chapters…</Centered>
  if (feed.isError) return <Centered>MangaDex unreachable — retry.</Centered>
  if (chapterRefs.length === 0) return <Centered>No English chapters.</Centered>

  return (
    <div className="relative h-full bg-black">
      <button
        onClick={onClose}
        className="absolute left-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
      >
        ← Back
      </button>

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
          rtl
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
