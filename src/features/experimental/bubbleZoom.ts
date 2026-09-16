// ML bubble zoom (FR-10, v2) — the Google-Books architecture: detect-once (elsewhere) →
// cache regions → this module maps a tap (or "next") to the region + zoom transform.
// Pure + model-agnostic. Falls back to null so callers use plain tap-zoom (never breaks).

import { zoomToPoint, type Transform } from '../reader/zoom/zoomMath'

export interface BubbleRegion {
  // Normalized [0..1] bbox within the page image.
  x: number
  y: number
  w: number
  h: number
  order: number // reading order for sequential "next bubble"
}

/** Find the region containing (or nearest to) a normalized tap point. */
export function regionAtPoint(
  regions: BubbleRegion[],
  nx: number,
  ny: number,
): BubbleRegion | null {
  if (regions.length === 0) return null
  // Prefer a containing region.
  const inside = regions.find(
    (r) => nx >= r.x && nx <= r.x + r.w && ny >= r.y && ny <= r.y + r.h,
  )
  if (inside) return inside
  // Else nearest center.
  let best: BubbleRegion | null = null
  let bestD = Infinity
  for (const r of regions) {
    const cx = r.x + r.w / 2
    const cy = r.y + r.h / 2
    const d = (cx - nx) ** 2 + (cy - ny) ** 2
    if (d < bestD) {
      bestD = d
      best = r
    }
  }
  return best
}

/** Next region in reading order after `currentOrder` (wraps). */
export function nextRegion(regions: BubbleRegion[], currentOrder: number): BubbleRegion | null {
  if (regions.length === 0) return null
  const sorted = [...regions].sort((a, b) => a.order - b.order)
  const next = sorted.find((r) => r.order > currentOrder)
  return next ?? sorted[0] // wrap to first
}

/** Compute the zoom transform to frame a region within a container of given px size. */
export function zoomToRegion(
  region: BubbleRegion,
  containerW: number,
  containerH: number,
  targetFill = 0.9,
): Transform {
  // Scale so the bubble fills ~targetFill of the smaller container dimension.
  const bubblePxW = region.w * containerW
  const bubblePxH = region.h * containerH
  const scale = Math.min(
    (containerW * targetFill) / Math.max(1, bubblePxW),
    (containerH * targetFill) / Math.max(1, bubblePxH),
    3, // cap
  )
  // Center of the bubble in container px.
  const cx = (region.x + region.w / 2) * containerW
  const cy = (region.y + region.h / 2) * containerH
  // Reuse tap-to-point zoom centered on the bubble.
  return zoomToPoint({ scale: 1, tx: 0, ty: 0 }, Math.max(1, scale), cx, cy)
}
