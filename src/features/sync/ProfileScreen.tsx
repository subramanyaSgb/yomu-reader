// Profile / account (FR-19): Google login (skippable), sync status. Works fully logged-out.
import { useAuth, signInWithGoogle, signOut } from './auth'
import { runSync } from './engine'
import { registerPush } from '../notifications/messaging'

export default function ProfileScreen() {
  const { user, ready, isSyncEnabled } = useAuth()

  return (
    <div className="px-4 pb-20 pt-4">
      <h1 className="mb-4 text-2xl font-bold text-white">Profile</h1>

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
