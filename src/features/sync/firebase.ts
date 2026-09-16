// Firebase init with graceful degradation. If VITE_FIREBASE_* env is absent, sync/auth are
// disabled and the app runs local-only (CLAUDE.md: local-first; cloud is a layer on top).
// This is why the owner can run everything with NO Firebase setup until they want sync.

import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

interface FbEnv {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  messagingSenderId?: string
}

function readEnv(): FbEnv | null {
  const e = import.meta.env as Record<string, string | undefined>
  const cfg = {
    apiKey: e.VITE_FIREBASE_API_KEY,
    authDomain: e.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: e.VITE_FIREBASE_PROJECT_ID,
    appId: e.VITE_FIREBASE_APP_ID,
    messagingSenderId: e.VITE_FIREBASE_SENDER_ID,
  }
  if (!cfg.apiKey || !cfg.projectId || !cfg.appId || !cfg.authDomain) return null
  return cfg as FbEnv
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let dbf: Firestore | null = null

const env = readEnv()
export const isSyncEnabled = env !== null

if (env) {
  app = initializeApp(env)
  auth = getAuth(app)
  dbf = getFirestore(app)
}

export function getFbAuth(): Auth {
  if (!auth) throw new Error('Firebase not configured (isSyncEnabled=false)')
  return auth
}
export function getFbDb(): Firestore {
  if (!dbf) throw new Error('Firebase not configured (isSyncEnabled=false)')
  return dbf
}
export { app as fbApp }
