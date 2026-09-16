// Profile / account (FR-19): Google login (skippable), sync status. Works fully logged-out.
import { useEffect, useState } from 'react'
import { useAuth, signInWithGoogle, signOut } from './auth'
import { runSync } from './engine'
import { registerPush } from '../notifications/messaging'
import StatsScreen from '../stats/StatsScreen'
import { loadTheme, saveTheme, type Theme } from '../settings/theme'

const THEMES: Theme[] = ['dark', 'light', 'sepia']

export default function ProfileScreen() {
  const { user, ready, isSyncEnabled } = useAuth()
  const [theme, setTheme] = useState<Theme>('dark')
  useEffect(() => {
    loadTheme().then(setTheme)
  }, [])

  return (
    <div className="px-4 pb-20 pt-4">
      <h1 className="mb-4 text-2xl font-bold text-white">Profile</h1>

      <div className="mb-4">
        <StatsScreen />
      </div>

      <div className="mb-4 rounded-lg bg-neutral-800 p-3">
        <div className="mb-2 text-sm text-neutral-400">Theme</div>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTheme(t)
                void saveTheme(t)
              }}
              className={`rounded px-3 py-1 text-sm ${
                theme === t ? 'bg-violet-600 text-white' : 'bg-neutral-700 text-neutral-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {!isSyncEnabled && (
        <p className="mb-4 rounded-lg bg-neutral-800 p-3 text-sm text-neutral-400">
          Sync is off — running local-only. Add Firebase config to enable Google login,
          cross-device sync, and notifications (see docs/FIREBASE-SETUP.md).
        </p>
      )}

      {isSyncEnabled && !user && ready && (
        <button
          onClick={() => signInWithGoogle()}
          className="rounded-lg bg-violet-600 px-4 py-2 text-white"
        >
          Sign in with Google
        </button>
      )}

      {isSyncEnabled && user && (
        <div className="space-y-3">
          <div className="text-neutral-200">{user.displayName ?? user.email}</div>
          <div className="flex gap-2">
            <button
              onClick={() => runSync()}
              className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white"
            >
              Sync now
            </button>
            <button
              onClick={() => registerPush()}
              className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white"
            >
              Enable notifications
            </button>
            <button
              onClick={() => signOut()}
              className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-red-400"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
