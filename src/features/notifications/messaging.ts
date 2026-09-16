// FCM client (FR-29): register a push token when authed; SW handles incoming pushes.
// Also local notifications (FR-30). No-ops when sync/Firebase disabled or permission denied.

import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { isSyncEnabled, fbApp } from '../sync/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { getFbDb, getFbAuth } from '../sync/firebase'

const VAPID_KEY = import.meta.env?.VITE_FCM_VAPID_KEY as string | undefined

/** Ask for notification permission + register the FCM token under the user. */
export async function registerPush(): Promise<string | null> {
  if (!isSyncEnabled || !fbApp || !VAPID_KEY) return null
  if (!(await isSupported().catch(() => false))) return null
  if (typeof Notification === 'undefined') return null

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return null

  const messaging = getMessaging(fbApp)
  const token = await getToken(messaging, { vapidKey: VAPID_KEY }).catch(() => null)
  if (!token) return null

  const u = getFbAuth().currentUser?.uid
  if (u) {
    await setDoc(doc(getFbDb(), 'users', u, 'fcmTokens', token), { createdAt: Date.now() })
  }
  return token
}

/** Local (client-side) notification — download complete, goal/streak reminders. */
export function localNotify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/icon.png' })
}
