// Paged navigation math (FR-8). RTL (manga) vs LTR direction affects which on-screen action
// ("go right" / "swipe left") maps to next vs previous. Pure + tested.

export type Direction = 'rtl' | 'ltr'
export type Action = 'left' | 'right' // physical side the user activated

/** Does activating `action` mean "advance" (next page)? In RTL, LEFT = next. */
export function isAdvance(action: Action, dir: Direction): boolean {
  return dir === 'rtl' ? action === 'left' : action === 'right'
}

/** Next page index given a physical action, clamped to [0, total-1]. */
export function nextIndex(
  current: number,
  total: number,
  action: Action,
  dir: Direction,
): number {
  const delta = isAdvance(action, dir) ? 1 : -1
  return Math.min(total - 1, Math.max(0, current + delta))
}

/** Whether advancing past the last / retreating before the first should change chapter. */
export function chapterCrossing(
  current: number,
  total: number,
  action: Action,
  dir: Direction,
): 'next-chapter' | 'prev-chapter' | null {
  const advancing = isAdvance(action, dir)
  if (advancing && current === total - 1) return 'next-chapter'
  if (!advancing && current === 0) return 'prev-chapter'
  return null
}
