// Zoomable image (FR-9): pinch-to-zoom + pan while zoomed; single tap toggles the HUD.
// Double-tap zoom removed by owner request (it fired accidentally while reading).
// Uses pure zoomMath so the tricky part is already tested.

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  identity,
  zoomToPoint,
  clampPan,
  toCss,
  type Transform,
} from './zoomMath'

interface Props {
  src: string
  alt?: string
  onZoomChange?: (zoomed: boolean) => void
  onTap?: () => void
}

export default function ZoomableImage({ src, alt = '', onZoomChange, onTap }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [t, setT] = useState<Transform>(identity())
  const pan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const pinch = useRef<{ dist: number; scale: number } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const downPos = useRef<{ x: number; y: number } | null>(null)

  function size() {
    const r = ref.current?.getBoundingClientRect()
    return { w: r?.width ?? 0, h: r?.height ?? 0 }
  }
  function apply(next: Transform) {
    const { w, h } = size()
    const clamped = clampPan(next, w, h)
    setT(clamped)
    onZoomChange?.(clamped.scale > 1)
  }
  function localPoint(e: { clientX: number; clientY: number }) {
    const r = ref.current!.getBoundingClientRect()
    return { px: e.clientX - r.left, py: e.clientY - r.top }
  }

  function onPointerDown(e: ReactPointerEvent) {
    ref.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    downPos.current = { x: e.clientX, y: e.clientY }

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: dist(a, b), scale: t.scale }
      pan.current = null
      return
    }

    if (t.scale > 1) pan.current = { x: e.clientX, y: e.clientY, tx: t.tx, ty: t.ty }
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const ratio = dist(a, b) / pinch.current.dist
      const scale = Math.min(3, Math.max(1, pinch.current.scale * ratio))
      const mid = { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }
      const { px, py } = localPoint(mid)
      apply(zoomToPoint(t, scale, px, py))
      return
    }

    if (pan.current) {
      apply({
        scale: t.scale,
        tx: pan.current.tx + (e.clientX - pan.current.x),
        ty: pan.current.ty + (e.clientY - pan.current.y),
      })
    }
  }

  function onPointerUp(e: ReactPointerEvent) {
    // Single-tap (small movement, not a pinch, not zoomed): toggle HUD immediately —
    // no double-tap gesture exists anymore, so no disambiguation delay needed.
    if (
      onTap && downPos.current && pointers.current.size === 1 && !pinch.current &&
      t.scale === 1 &&
      Math.hypot(e.clientX - downPos.current.x, e.clientY - downPos.current.y) < 10
    ) {
      onTap()
    }
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) pan.current = null
  }

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden"
      // CRITICAL: touch-action must allow vertical panning at 1x or the long-strip
      // cannot be scrolled by touch at all (every image swallowed the gesture).
      // Only lock gestures while actually zoomed (panning the image ourselves).
      style={{ touchAction: t.scale > 1 ? 'none' : 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        className="w-full select-none"
        style={{ transform: toCss(t), transformOrigin: '0 0' }}
        onError={(e) => {
          // Per-image recovery (FR-36 AC3): one silent retry with a cache-buster.
          const img = e.currentTarget
          if (!img.dataset.retried) {
            img.dataset.retried = '1'
            img.src = `${src}${src.includes('?') ? '&' : '?'}r=1`
          }
        }}
      />
    </div>
  )
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
