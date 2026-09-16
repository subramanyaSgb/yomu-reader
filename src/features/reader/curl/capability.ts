// WebGL capability check for the page-curl (FR-8 AC4). If WebGL isn't usable, the paged
// reader falls back to a CSS slide. Pure-ish (touches DOM only to probe); safe to call once.

export function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    return !!gl
  } catch {
    return false
  }
}

export type TurnMode = 'curl' | 'slide'

/** Choose the turn animation. Honors a user override; else auto by capability. */
export function chooseTurnMode(override?: TurnMode): TurnMode {
  if (override) return override
  return hasWebGL() ? 'curl' : 'slide'
}
