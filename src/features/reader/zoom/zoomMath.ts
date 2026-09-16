// Pure zoom transform math (FR-9). Kept separate from React so it's unit-testable.
// Model: a scale + translate applied to an image. Tapping a point should zoom while
// keeping that point visually anchored (Google-Photos-style tap-to-zoom-at-point).

export interface Transform {
  scale: number
  tx: number // translate x (px)
  ty: number // translate y (px)
}

export const ZOOM_LEVELS = [1, 2, 3] as const

export function identity(): Transform {
  return { scale: 1, tx: 0, ty: 0 }
}

/** Next level in the 1x->2x->3x->1x cycle. */
export function cycleScale(current: number): number {
  const i = ZOOM_LEVELS.findIndex((z) => Math.abs(z - current) < 0.01)
  const next = ZOOM_LEVELS[(i + 1) % ZOOM_LEVELS.length]
  return next
}

/**
 * Zoom to `scale` keeping the point (px,py) — in *container* coords — anchored.
 * Derivation: for anchor to stay put, newTranslate = point - scale*(point - oldTranslate)/oldScale.
 */
export function zoomToPoint(
  prev: Transform,
  scale: number,
  px: number,
  py: number,
): Transform {
  const ratio = scale / prev.scale
  return {
    scale,
    tx: px - ratio * (px - prev.tx),
    ty: py - ratio * (py - prev.ty),
  }
}

/**
 * Clamp translate so the scaled image can't be dragged past its edges into empty space.
 * width/height are the *container* dimensions (image assumed to fill container at scale 1).
 */
export function clampPan(t: Transform, width: number, height: number): Transform {
  if (t.scale <= 1) return { scale: t.scale, tx: 0, ty: 0 }
  const maxX = 0
  const minX = width - width * t.scale
  const maxY = 0
  const minY = height - height * t.scale
  return {
    scale: t.scale,
    tx: Math.min(maxX, Math.max(minX, t.tx)),
    ty: Math.min(maxY, Math.max(minY, t.ty)),
  }
}

export function toCss(t: Transform): string {
  return `translate(${t.tx}px, ${t.ty}px) scale(${t.scale})`
}
