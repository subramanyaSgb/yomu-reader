// Yomu chapter poller (FR-29). Scheduled Cloud Function: every 45 min, for each user's
// notify-flagged follows, check MangaDex latest chapters, diff against last-seen, and send a
// BATCHED FCM digest ("N series updated"). Polite MangaDex client (identify, throttle).
//
// Deploy on the owner's Firebase: `cd functions && npm install && npm run deploy`.

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

initializeApp()
const db = getFirestore()

const UA = 'Yomu/0.1 (personal-use reader; notification poller)'

async function latestEnglishChapterId(seriesId) {
  const url =
    `https://api.mangadex.org/manga/${seriesId}/feed` +
    `?translatedLanguage[]=en&order[publishAt]=desc&limit=1`
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) return null
  const json = await res.json()
  return json.data?.[0]?.id ?? null
}

export const pollChapters = onSchedule('every 45 minutes', async () => {
  const users = await db.collection('users').get()

  for (const user of users.docs) {
    const uid = user.id
    // Library rows flagged notify=true.
    const libSnap = await db.doc(`users/${uid}/data/library`).get()
    const rows = (libSnap.data()?.rows ?? []).filter((r) => r.notify)
    if (rows.length === 0) continue

    const updated = []
    for (const row of rows) {
      const seriesId = row.seriesId ?? row.id
      const latest = await latestEnglishChapterId(seriesId)
      if (!latest) continue
      const seenRef = db.doc(`users/${uid}/lastSeen/${seriesId}`)
      const seen = (await seenRef.get()).data()?.chapterId
      if (seen && seen !== latest) updated.push(row.title ?? seriesId)
      await seenRef.set({ chapterId: latest }, { merge: true })
      // Throttle: stay well under MangaDex ~5 req/s.
      await new Promise((r) => setTimeout(r, 250))
    }

    if (updated.length === 0) continue

    // Batched digest to all of the user's tokens.
    const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get()
    const tokens = tokensSnap.docs.map((d) => d.id)
    if (tokens.length === 0) continue

    const body =
      updated.length === 1 ? `${updated[0]} has a new chapter` : `${updated.length} series updated`
    await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: 'Yomu', body },
      data: { type: 'new-chapters' },
    })
  }
})
