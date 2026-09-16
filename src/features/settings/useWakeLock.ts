// Keep-screen-awake while reading (FR-33). Screen Wake Lock API (Android Chrome supported;
// no-ops where unsupported, e.g. iOS Safari — documented platform limit).
import { useEffect } from 'react'

export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let lock: WakeLockSentinel | null = null
    let released = false

    const acquire = async () => {
      try {
        lock = await (navigator as Navigator & { wakeLock: WakeLock }).wakeLock.request('screen')
      } catch {
        /* denied / unsupported — silently no-op */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !released) void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
    }
  }, [enabled])
}
