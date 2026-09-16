// New-chapter push notifications (Web Push via the Worker — no Firebase).
// The Worker cron compares each Reading-shelf series' latest chapter with what the
// device last saw; the SW (push-sw.js) shows the notifications.

import { CATALOG } from '../../catalog'
import { getSetting, setSetting } from '../../lib/db/repo'
import { getShelves, shelfOf } from '../shelf/shelf'
import { getSeriesMeta } from '../shelf/seriesMeta'

const PROXY_BASE =
  (import.meta.env?.VITE_IMAGE_PROXY as string | undefined) ?? 'http://localhost:8787'
const ENABLED_KEY = 'push:enabled'
const SYNC_AT_KEY = 'push:lastSync'

function pushUrl(path: string): string {
  return new URL(path, PROXY_BASE).toString()
}

function b64uToUint8(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const b = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(b, c => c.charCodeAt(0))
}

export async function isPushEnabled(): Promise<boolean> {
  return (await getSetting<boolean>(ENABLED_KEY)) === true
}

async function readingListState() {
  const shelves = await getShelves()
  const reading = CATALOG.filter(e => !e.unavailable && shelfOf(shelves, e.id) === 'reading')
  const out: Array<{ id: string; title: string; lastNumber: string | null }> = []
  for (const e of reading) {
    const meta = await getSeriesMeta(e.id)
    if (meta?.notify === false) continue // per-series opt-out
    out.push({ id: e.id, title: e.title, lastNumber: meta?.lastNumber ?? null })
  }
  return out
}

export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'Push is not supported in this browser' }
  }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, reason: 'Notification permission denied' }

  const reg = await navigator.serviceWorker.ready
  const { publicKey } = await (await fetch(pushUrl('/push/vapid'))).json() as { publicKey: string }
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToUint8(publicKey) as BufferSource }))

  const series = await readingListState()
  const res = await fetch(pushUrl('/push/subscribe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), series }),
  })
  if (!res.ok) return { ok: false, reason: `Server error ${res.status}` }
  await setSetting(ENABLED_KEY, true)
  await setSetting(SYNC_AT_KEY, Date.now())
  return { ok: true }
}

export async function disablePush(): Promise<void> {
  await setSetting(ENABLED_KEY, false)
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await fetch(pushUrl('/push/unsubscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    }
  } catch { /* best effort */ }
}

/** Keep the server's view of the reading list fresh (called from the shelf screen;
 *  throttled to once per 30 min). */
export async function syncPushState(): Promise<void> {
  if (!(await isPushEnabled())) return
  const last = (await getSetting<number>(SYNC_AT_KEY)) ?? 0
  if (Date.now() - last < 30 * 60 * 1000) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    const series = await readingListState()
    await fetch(pushUrl('/push/state'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, series }),
    })
    await setSetting(SYNC_AT_KEY, Date.now())
  } catch { /* retry next visit */ }
}
