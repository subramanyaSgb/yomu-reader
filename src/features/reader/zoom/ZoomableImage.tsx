// Strip page image. Zoom removed by owner request (pinch/double-tap zoomed the whole
// app and clashed with system gestures) — this is now a plain image with single-tap
// HUD toggle, failure retry, and content-visibility for flat memory on long strips.

import { useRef, useState, useReducer, type PointerEvent as ReactPointerEvent } from 'react'

interface Props {
  src: string
  alt?: string
  onTap?: () => void
}

export default function ZoomableImage({ src, alt = '', onTap }: Props) {
  const downPos = useRef<{ x: number; y: number } | null>(null)
  const [failed, setFailed] = useState(false)
  const [retryNonce, bumpRetry] = useReducer((n: number) => n + 1, 0)

  function onPointerDown(e: ReactPointerEvent) {
    downPos.current = { x: e.clientX, y: e.clientY }
  }

  function onPointerUp(e: ReactPointerEvent) {
    if (
      onTap && downPos.current &&
      Math.hypot(e.clientX - downPos.current.x, e.clientY - downPos.current.y) < 10
    ) {
      onTap()
    }
    downPos.current = null
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      // content-visibility: offscreen pages skip layout/paint and their decoded
      // bitmaps get discarded — long sessions stay flat on memory. `auto <est>`
      // remembers the real size once rendered, so no scroll jumps.
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 600px' }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { downPos.current = null }}
    >
      <img
        key={retryNonce}
        src={retryNonce > 0 ? `${src}${src.includes('?') ? '&' : '?'}r=${retryNonce}` : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="w-full select-none"
        onError={(e) => {
          // Per-image recovery (FR-36 AC3): one silent retry with a cache-buster,
          // then a visible tap-to-retry placeholder instead of a dead blank space.
          const img = e.currentTarget
          if (!img.dataset.retried) {
            img.dataset.retried = '1'
            img.src = `${src}${src.includes('?') ? '&' : '?'}r=auto`
          } else {
            setFailed(true)
          }
        }}
        onLoad={() => { if (failed) setFailed(false) }}
      />
      {failed && (
        <button
          onClick={() => { setFailed(false); bumpRetry() }}
          style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 180,
            background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.2)',
            color: '#9ca3af', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
          <span style={{ fontSize: 20 }}>⟳</span>
          Page failed to load — tap to retry
        </button>
      )}
    </div>
  )
}
