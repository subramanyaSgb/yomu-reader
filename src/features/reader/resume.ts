// Resume persistence (FR-18): save progress throttled while reading + flush on
// background/close; restore on open. Throttle is a pure factory so it's testable.

import { saveProgress, getProgress } from '../../lib/db/repo'
import type { Progress, ReadMode } from '../../lib/db/schema'

export type Position = Progress['position']

/** Leading+trailing throttle: fires immediately, then at most once per `ms`, and
 *  guarantees the final call lands (trailing flush). Injectable clock for tests. */
export function throttle<T extends (...a: never[]) => void>(
  fn: T,
  ms: number,
  now: () => number = Date.now,
): T & { flush: () => void } {
  let last = -Infinity // ensure the first call always fires (leading edge)
  let pending: Parameters<T> | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const run = (args: Parameters<T>) => {
    last = now()
    fn(...args)
  }
  const wrapped = ((...args: Parameters<T>) => {
    const elapsed = now() - last
    if (elapsed >= ms) {
      run(args)
    } else {
      pending = args
      if (!timer) {
        timer = setTimeout(() => {
          timer = null
          if (pending) {
            run(pending)
            pending = null
          }
        }, ms - elapsed)
      }
    }
  }) as T & { flush: () => void }

  wrapped.flush = () => {
    if (pending) {
      run(pending)
      pending = null
    }
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }
  return wrapped
}

export function makeProgressSaver(seriesId: string, ms = 3000) {
  const saver = throttle((chapterId: string, mode: ReadMode, position: Position) => {
    void saveProgress({
      seriesId,
      lastChapterId: chapterId,
      mode,
      position,
      updatedAt: Date.now(),
    })
  }, ms)
  return saver
}

export function restoreProgress(seriesId: string) {
  return getProgress(seriesId)
}
