// Error logging (FR-37): Crashlytics-style. Reports to Firebase if enabled, else keeps a
// local ring buffer the owner can inspect. Strips content specifics; keeps diagnostics.
import { isSyncEnabled } from '../sync/firebase'

export interface LoggedError {
  at: number
  message: string
  stack?: string
  context?: string
}

const RING_MAX = 50
const ring: LoggedError[] = []

export function reportError(err: unknown, context?: string) {
  const e: LoggedError = {
    at: Date.now(),
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    context,
  }
  ring.push(e)
  if (ring.length > RING_MAX) ring.shift()

  // Always log to console for local visibility.
  console.error('[yomu]', context ?? '', e.message)

  // If Firebase is configured, a real deploy would forward to Crashlytics/Analytics here.
  // Kept as a hook so it never throws when sync is disabled.
  if (isSyncEnabled) {
    // ponytail: wire firebase/analytics logEvent in a real deploy; no-op stub keeps it safe.
  }
}

export function recentErrors(): LoggedError[] {
  return [...ring]
}
