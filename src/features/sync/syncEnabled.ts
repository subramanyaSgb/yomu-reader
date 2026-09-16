// Standalone sync-enabled check. Deliberately imports NOTHING from firebase so that
// modules that only need the flag (errorReporter, etc.) don't drag the ~540KB firebase
// chunk into the initial bundle. firebase.ts re-exports this for its own callers.

export const isSyncEnabled = (() => {
  const e = (import.meta.env ?? {}) as Record<string, string | undefined>
  return Boolean(
    e.VITE_FIREBASE_API_KEY && e.VITE_FIREBASE_PROJECT_ID && e.VITE_FIREBASE_APP_ID && e.VITE_FIREBASE_AUTH_DOMAIN,
  )
})()
