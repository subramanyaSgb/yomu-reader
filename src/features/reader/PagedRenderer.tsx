// Paged reader (FR-8): RTL/LTR, page turn (curl or slide), edge-tap + swipe + arrows,
// auto-hiding HUD with page counter. Curl vs slide chosen by capability (or override).
//
// ponytail: the "curl" here is a CSS 3D fold (rotateY with shading) — a real, visible
// page-turn that runs on any device. A true WebGL finger-follow curl shader is the
// documented v-next enhancement (TDD §6 flags it as the hardest single thing); this
// ships the never-broken version first, exactly as the plan requires.

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useChapterPages } from './useChapterPages'
import { nextIndex, chapterCrossing, type Action, type Direction } from './pagedNav'
import { chooseTurnMode, type TurnMode } from './curl/capability'
import type { ImageQuality } from '../../lib/proxy/imageUrl'
import type { ChapterRef } from './VerticalScrollRenderer'

interface Props {
  chapters: ChapterRef[]
  chapterIndex: number
  onChapterChange: (idx: number) => void
  rtl?: boolean
  turnOverride?: TurnMode
  gapColor?: string
  quality?: ImageQuality
  initialPage?: number
  onPageChange?: (page: number) => void
}

export default function PagedRenderer({
  chapters,
  chapterIndex,
  onChapterChange,
  rtl = true,
  turnOverride,
  gapColor = '#000',
  quality = 'source',
  initialPage = 0,
  onPageChange,
}: Props) {
  const dir: Direction = rtl ? 'rtl' : 'ltr'
  const chapter = chapters[chapterIndex]
  const { pages, isLoading, isError } = useChapterPages(chapter?.id, quality, chapter?.source ?? 'mangadex')
  const [page, setPage] = useState(initialPage)
  const [turning, setTurning] = useState<'left' | 'right' | null>(null)
  const [hudVisible, setHudVisible] = useState(true)
  const turnMode = useRef<TurnMode>(chooseTurnMode(turnOverride))
  const hudTimer = useRef<number | undefined>(undefined)

  // Reset to first page on chapter change — but not on mount (exact-position resume).
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    setPage(0)
    onPageChange?.(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex])

  // Auto-hide HUD.
  useEffect(() => {
    if (!hudVisible) return
    window.clearTimeout(hudTimer.current)
    hudTimer.current = window.setTimeout(() => setHudVisible(false), 2500)
    return () => window.clearTimeout(hudTimer.current)
  }, [hudVisible, page])

  function turn(action: Action) {
    if (pages.length === 0) return
    const crossing = chapterCrossing(page, pages.length, action, dir)
    if (crossing === 'next-chapter' && chapterIndex < chapters.length - 1) {
      onChapterChange(chapterIndex + 1)
      return
    }
    if (crossing === 'prev-chapter' && chapterIndex > 0) {
      onChapterChange(chapterIndex - 1)
      return
    }
    const next = nextIndex(page, pages.length, action, dir)
    if (next === page) return
    // brief turn animation
    setTurning(action)
    window.setTimeout(() => {
      setPage(next)
      onPageChange?.(next)
      setTurning(null)
    }, turnMode.current === 'curl' ? 260 : 160)
  }

  // Keyboard arrows.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') turn('right')
      if (e.key === 'ArrowLeft') turn('left')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pages.length, chapterIndex])

  // Swipe.
  const touchStart = useRef<number | null>(null)
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current === null) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    if (Math.abs(dx) > 40) turn(dx < 0 ? 'left' : 'right')
    else setHudVisible((v) => !v)
    touchStart.current = null
  }

  if (isLoading) return <Center gap={gapColor}>Loading…</Center>
  if (isError) return <Center gap={gapColor}>Failed — retry.</Center>
  if (pages.length === 0) return <Center gap={gapColor}>No pages.</Center>

  const turnClass =
    turnMode.current === 'curl'
      ? turning
        ? 'origin-left [transform:rotateY(-25deg)] shadow-2xl transition-transform duration-200'
        : 'transition-transform duration-200'
      : turning
        ? 'translate-x-[-8%] opacity-90 transition-all duration-150'
        : 'transition-all duration-150'

  return (
    <div
      className="relative flex h-full items-center justify-center [perspective:1600px]"
      style={{ background: gapColor }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Edge tap zones */}
      <button
        aria-label="left"
        onClick={() => turn('left')}
        className="absolute left-0 top-0 z-10 h-full w-1/3"
      />
      <button
        aria-label="right"
        onClick={() => turn('right')}
        className="absolute right-0 top-0 z-10 h-full w-1/3"
      />

      <img
        src={pages[page]}
        alt=""
        draggable={false}
        className={`max-h-full max-w-full select-none ${turnClass}`}
      />

      {/* On-screen arrows */}
      {hudVisible && (
        <>
          <ArrowBtn side="left" onClick={() => turn('left')} />
          <ArrowBtn side="right" onClick={() => turn('right')} />
          <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            Ch. {chapter?.number ?? '?'} · {page + 1}/{pages.length}
          </div>
        </>
      )}
    </div>
  )
}

function ArrowBtn({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous page' : 'Next page'}
      className={`absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur ${
        side === 'left' ? 'left-2' : 'right-2'
      }`}
    >
      {side === 'left' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  )
}

function Center({ children, gap }: { children: React.ReactNode; gap: string }) {
  return (
    <div className="flex h-full items-center justify-center text-neutral-400" style={{ background: gap }}>
      {children}
    </div>
  )
}
