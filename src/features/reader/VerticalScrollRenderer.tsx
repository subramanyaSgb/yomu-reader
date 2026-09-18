// Vertical scroll reader (FR-7): edge-to-edge continuous images, seamless transition into
// the next chapter (loads inline near the end — no tap), tracks current chapter + position
// anchor, reports progress %, keyboard navigation, tap-to-toggle HUD.

import { useEffect, useRef, useState } from 'react'
import { useChapterPages } from './useChapterPages'
import { toAnchor, type ImageBox, type ScrollAnchor } from './scrollAnchor'
import type { ImageQuality } from '../../lib/proxy/imageUrl'
import ZoomableImage from './zoom/ZoomableImage'

export interface ChapterRef {
  id: string
  number: string | null
  source?: 'mangadex' | 'kakalot'
}

interface Props {
  chapters: ChapterRef[] // resolved, ordered
  startIndex: number
  quality?: ImageQuality
  stripWidthPct?: number // max strip width (desktop comfort); 100 = edge-to-edge
  initialAnchor?: ScrollAnchor | null // exact-position resume within the start chapter
  onChapterChange?: (chapterIndex: number) => void
  onProgressChange?: (pct: number) => void // % through the current chapter
  onAnchorChange?: (anchor: ScrollAnchor) => void // per-chapter anchor (image #i + pct)
  onTap?: () => void // single tap at 1x — HUD toggle
  autoScroll?: boolean // FR-12
  autoScrollSpeed?: number // px per tick
}

// One chapter's images stacked; reports its images as loaded so the parent can measure.
function ChapterPages({ chapterId, source, quality, onTap }: {
  chapterId: string; source?: 'mangadex' | 'kakalot'; quality: ImageQuality; onTap?: () => void
}) {
  const { pages, isLoading, isError } = useChapterPages(chapterId, quality, source ?? 'mangadex')
  if (isLoading) return <div className="py-8 text-center text-neutral-500">Loading…</div>
  if (isError) return <div className="py-8 text-center text-red-400">Failed. Retry.</div>
  return (
    <>
      {pages.map((src, i) => (
        <ZoomableImage key={`${chapterId}:${i}`} src={src} onTap={onTap} />
      ))}
    </>
  )
}

export default function VerticalScrollRenderer({
  chapters,
  startIndex,
  quality = 'source',
  stripWidthPct = 100,
  initialAnchor = null,
  onChapterChange,
  onProgressChange,
  onAnchorChange,
  onTap,
  autoScroll = false,
  autoScrollSpeed = 1,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  // The strip is anchored at baseIndex and grows toward the end as you scroll.
  const [baseIndex, setBaseIndex] = useState(startIndex)
  const [loadedCount, setLoadedCount] = useState(1)
  const currentIndexRef = useRef(startIndex)

  // External jump (chapter picker / restore) — NOT the echo of our own onChapterChange.
  // Re-basing on every scroll-driven index change made the strip jump/blank mid-read.
  useEffect(() => {
    if (startIndex === currentIndexRef.current) return
    setBaseIndex(startIndex)
    setLoadedCount(1)
    currentIndexRef.current = startIndex
    if (scroller.current) scroller.current.scrollTop = 0
  }, [startIndex])

  // Auto-scroll (FR-12): hands-free scroll.
  useEffect(() => {
    if (!autoScroll) return
    const el = scroller.current
    if (!el) return
    const id = window.setInterval(() => {
      el.scrollTop += autoScrollSpeed
    }, 16) // ~60fps
    return () => window.clearInterval(id)
  }, [autoScroll, autoScrollSpeed])

  // Exact-position resume. Two subtleties, both learned the hard way:
  // 1. content-visibility gives UNLOADED images an estimated height, so "the target
  //    has a height" is NOT proof the layout is real — we force-load the target and
  //    its neighbours (loading='eager') and pin to the target IMAGE each tick until
  //    both the scroll position and the target's own height are stable.
  // 2. While restoring, no anchor may be SAVED (see handleScroll) and only real
  //    scroll intent (wheel/touchmove) cancels — a tap to show the HUD must not.
  const anchorDone = useRef(!initialAnchor || (initialAnchor.imageIndex === 0 && initialAnchor.offsetPct === 0))
  useEffect(() => {
    if (!initialAnchor || anchorDone.current) return
    const el = scroller.current
    if (!el) return
    let stableHits = 0
    let lastHeight = -1
    let cancelled = false
    const cancel = () => { cancelled = true; anchorDone.current = true }
    el.addEventListener('wheel', cancel, { once: true, passive: true })
    el.addEventListener('touchmove', cancel, { once: true, passive: true })
    const started = performance.now()
    const timer = window.setInterval(() => {
      if (cancelled || performance.now() - started > 20_000) {
        anchorDone.current = true
        window.clearInterval(timer)
        return
      }
      const section = el.querySelector(`[data-chapter-index="${currentIndexRef.current}"]`)
      if (!section) return
      const imgs = Array.from(section.querySelectorAll('img'))
      if (imgs.length <= initialAnchor.imageIndex) return
      // Force the browser to actually fetch the target area (lazy images offscreen
      // would otherwise keep their estimated size forever).
      for (let i = Math.max(0, initialAnchor.imageIndex - 1); i <= Math.min(imgs.length - 1, initialAnchor.imageIndex + 1); i++) {
        imgs[i].loading = 'eager'
      }
      const wrapper = imgs[initialAnchor.imageIndex].parentElement as HTMLElement
      if (!imgs[initialAnchor.imageIndex].complete || wrapper.offsetHeight === 0) return
      const target = wrapper.offsetTop + initialAnchor.offsetPct * wrapper.offsetHeight
      const heightStable = wrapper.offsetHeight === lastHeight
      lastHeight = wrapper.offsetHeight
      if (Math.abs(el.scrollTop - target) < 4 && heightStable) {
        if (++stableHits >= 3) { anchorDone.current = true; window.clearInterval(timer) }
      } else {
        stableHits = 0
        el.scrollTop = target
      }
    }, 250)
    return () => {
      window.clearInterval(timer)
      el.removeEventListener('wheel', cancel)
      el.removeEventListener('touchmove', cancel)
    }
  }, [initialAnchor])

  // Keyboard navigation (desktop): arrows / space / page keys.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = scroller.current
      if (!el) return
      const step = el.clientHeight * 0.85
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        el.scrollBy({ top: step, behavior: 'smooth' }); e.preventDefault()
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        el.scrollBy({ top: -step, behavior: 'smooth' }); e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Scroll events fire at 60Hz+ and the handler walks the DOM (querySelectorAll +
  // offsetTop reads) — throttle to one run per animation frame to avoid layout thrash.
  const scrollScheduled = useRef(false)
  function onScroll() {
    if (scrollScheduled.current) return
    scrollScheduled.current = true
    requestAnimationFrame(() => {
      scrollScheduled.current = false
      handleScroll()
    })
  }

  function handleScroll() {
    const el = scroller.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el

    // Seamless transition: mount the next chapter ~3 viewports early so its pages
    // (and page-list fetch) are already loading before the reader reaches them.
    if (
      scrollHeight - (scrollTop + clientHeight) < clientHeight * 3 &&
      baseIndex + loadedCount < chapters.length
    ) {
      setLoadedCount((n) => n + 1)
    }

    // Current chapter = section containing the viewport top. Anchor + progress are
    // computed against THAT chapter's images so resume survives re-basing the strip.
    const sections = Array.from(el.querySelectorAll('[data-chapter-index]')) as HTMLElement[]
    for (const s of sections) {
      if (scrollTop < s.offsetTop + s.offsetHeight) {
        const idx = Number(s.dataset.chapterIndex)
        if (idx !== currentIndexRef.current) {
          currentIndexRef.current = idx
          onChapterChange?.(idx)
        }
        // NEVER save position while the restore loop is still converging — its
        // programmatic scrolls fire this handler, and persisting those transient
        // spots is exactly how "resume moved me forward" happened.
        if (anchorDone.current) {
          const boxes: ImageBox[] = Array.from(s.querySelectorAll('img')).map((img) => ({
            top: (img.parentElement as HTMLElement).offsetTop,
            height: (img.parentElement as HTMLElement).offsetHeight,
          }))
          onAnchorChange?.(toAnchor(scrollTop, boxes))
        }
        const pct = s.offsetHeight > clientHeight
          ? Math.min(100, Math.max(0, Math.round(((scrollTop - s.offsetTop + clientHeight) / s.offsetHeight) * 100)))
          : 100
        onProgressChange?.(pct)
        break
      }
    }
  }

  return (
    <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto bg-black">
      <div style={stripWidthPct < 100 ? { maxWidth: `${stripWidthPct}%`, margin: '0 auto' } : undefined}>
      {Array.from({ length: loadedCount }).map((_, offset) => {
        const idx = baseIndex + offset
        const ch = chapters[idx]
        if (!ch) return null
        return (
          <section key={ch.id} data-chapter-index={idx}>
            {offset > 0 && (
              <div className="py-3 text-center text-xs text-neutral-500">
                Ch. {ch.number ?? '?'}
              </div>
            )}
            <ChapterPages chapterId={ch.id} source={ch.source} quality={quality} onTap={onTap} />
          </section>
        )
      })}
      </div>
    </div>
  )
}
