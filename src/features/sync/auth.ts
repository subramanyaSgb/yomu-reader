// Google auth (FR-19), skippable. No-ops cleanly when Firebase isn't configured.
import { useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { isSyncEnabled, getFbAuth } from './firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!isSyncEnabled)

  useEffect(() => {
    if (!isSyncEnabled) return
    const unsub = onAuthStateChanged(getFbAuth(), (u) => {
      setUser(u)
      setReady(true)
    })
    return unsub
  }, [])

  return { user, ready, isSyncEnabled }
}

export async function signInWithGoogle() {
  if (!isSyncEnabled) return
  await signInWithPopup(getFbAuth(), new GoogleAuthProvider())
}

export async function signOut() {
  if (!isSyncEnabled) return
  await fbSignOut(getFbAuth())
}
