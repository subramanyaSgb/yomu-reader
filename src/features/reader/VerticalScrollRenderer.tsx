// Vertical scroll reader (FR-7): edge-to-edge continuous images, seamless transition into
// the next chapter (loads inline near the end — no tap), tracks current chapter + position
// anchor. Position is held in state this phase; persistence is Phase 2.

import { useEffect, useRef, useState } from 'react'
import { useChapterPages } from './useChapterPages'
import { toAnchor, type ImageBox, type ScrollAnchor } from './scrollAnchor'
import ZoomableImage from './zoom/ZoomableImage'

export interface ChapterRef {
  id: string
  number: string | null
}

interface Props {
  chapters: ChapterRef[] // resolved, ordered
  startIndex: number
  onChapterChange?: (chapterIndex: number) => void
  onAnchorChange?: (anchor: ScrollAnchor) => void
}

// One chapter's images stacked; reports its images as loaded so the parent can measure.
function ChapterPages({ chapterId }: { chapterId: string }) {
  const { pages, isLoading, isError } = useChapterPages(chapterId)
  if (isLoading) return <div className="py-8 text-center text-neutral-500">Loading…</div>
  if (isError) return <div className="py-8 text-center text-red-400">Failed. Retry.</div>
  return (
    <>
      {pages.map((src, i) => (
        <ZoomableImage key={`${chapterId}:${i}`} src={src} />
      ))}
    </>
  )
}

export default function VerticalScrollRenderer({
  chapters,
  startIndex,
  onChapterChange,
  onAnchorChange,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  // Which chapters are mounted (grows as you scroll toward the end — seamless transition).
  const [loadedCount, setLoadedCount] = useState(1)
  const currentIndexRef = useRef(startIndex)

  // Reset when the starting chapter changes.
  useEffect(() => {
    setLoadedCount(1)
    currentIndexRef.current = startIndex
  }, [startIndex])

  function onScroll() {
    const el = scroller.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el

    // Seamless transition: within one viewport of the bottom, mount the next chapter.
    if (
      scrollHeight - (scrollTop + clientHeight) < clientHeight &&
      startIndex + loadedCount < chapters.length
    ) {
      setLoadedCount((n) => n + 1)
    }

    // Track current chapter + anchor from laid-out image boxes.
    const imgs = Array.from(el.querySelectorAll('img'))
    const boxes: ImageBox[] = imgs.map((img) => ({
      top: (img.parentElement as HTMLElement).offsetTop,
      height: (img.parentElement as HTMLElement).offsetHeight,
    }))
    const anchor = toAnchor(scrollTop, boxes)
    onAnchorChange?.(anchor)

    // Approximate current chapter by which chapter section contains the top.
    const sections = Array.from(el.querySelectorAll('[data-chapter-index]')) as HTMLElement[]
    for (const s of sections) {
      if (scrollTop < s.offsetTop + s.offsetHeight) {
        const idx = Number(s.dataset.chapterIndex)
        if (idx !== currentIndexRef.current) {
          currentIndexRef.current = idx
          onChapterChange?.(idx)
        }
        break
      }
    }
  }

  return (
    <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto bg-black">
      {Array.from({ length: loadedCount }).map((_, offset) => {
        const idx = startIndex + offset
        const ch = chapters[idx]
        if (!ch) return null
        return (
          <section key={ch.id} data-chapter-index={idx}>
            {offset > 0 && (
              <div className="py-3 text-center text-xs text-neutral-500">
                Ch. {ch.number ?? '?'}
              </div>
            )}
            <ChapterPages chapterId={ch.id} />
          </section>
        )
      })}
    </div>
  )
}
