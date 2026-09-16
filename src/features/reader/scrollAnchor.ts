// Vertical-scroll position anchoring (FR-7 / FR-18 AC3). A raw pixel scrollTop is fragile:
// images load at different times and their heights shift, so a saved pixel offset lands in
// the wrong place after reload. Instead we anchor to "image #i, fraction f into it", which
// survives re-layout. Pure math here; the renderer wires it to real DOM measurements.

export interface ScrollAnchor {
  imageIndex: number
  offsetPct: number // 0..1 within that image
}

export interface ImageBox {
  top: number // offsetTop of the image within the scroll container
  height: number
}

/** Given the current scrollTop and the laid-out image boxes, compute the anchor. */
export function toAnchor(scrollTop: number, boxes: ImageBox[]): ScrollAnchor {
  if (boxes.length === 0) return { imageIndex: 0, offsetPct: 0 }
  // Find the image whose span contains scrollTop (the topmost visible image).
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i]
    if (scrollTop < b.top + b.height || i === boxes.length - 1) {
      const within = b.height > 0 ? (scrollTop - b.top) / b.height : 0
      return { imageIndex: i, offsetPct: clamp01(within) }
    }
  }
  return { imageIndex: boxes.length - 1, offsetPct: 0 }
}

/** Given a saved anchor and the (possibly re-laid-out) boxes, compute the scrollTop to restore. */
export function fromAnchor(anchor: ScrollAnchor, boxes: ImageBox[]): number {
  if (boxes.length === 0) return 0
  const i = Math.min(anchor.imageIndex, boxes.length - 1)
  const b = boxes[i]
  return b.top + clamp01(anchor.offsetPct) * b.height
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}
