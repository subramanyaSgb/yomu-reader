// Sync engine (FR-20): local-first. Local writes update Dexie immediately; when authed +
// online, push to Firestore and pull remote → LWW merge → Dexie. No-ops when sync disabled.
//
// Scope: library, progress, settings, bookmarks, download-list (ids only — never image bytes).

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { isSyncEnabled, getFbDb, getFbAuth } from './firebase'
import { mergeCollections, pickNewer, type Keyed } from './merge'
import { db } from '../../lib/db/schema'

function uid(): string | null {
  if (!isSyncEnabled) return null
  return getFbAuth().currentUser?.uid ?? null
}

/** Push a keyed collection to the user's Firestore doc (whole-collection, simple + fine for one user). */
async function pushCollection(name: string, rows: Keyed[]) {
  const u = uid()
  if (!u) return
  await setDoc(doc(getFbDb(), 'users', u, 'data', name), { rows }, { merge: false })
}

async function pullCollection(name: string): Promise<Keyed[]> {
  const u = uid()
  if (!u) return []
  const snap = await getDoc(doc(getFbDb(), 'users', u, 'data', name))
  return (snap.data()?.rows as Keyed[]) ?? []
}

/** Sync the library table (add updatedAt-style key from lastUpdatedAt). */
export async function syncLibrary(): Promise<void> {
  if (!uid()) return
  const local = (await db.library.toArray()).map((r) => ({
    ...r,
    id: r.seriesId,
    updatedAt: r.lastUpdatedAt,
  })) as unknown as Keyed[]
  const remote = await pullCollection('library')
  const merged = mergeCollections(local, remote)
  // Write merged back locally + remotely.
  await db.library.bulkPut(
    merged.map((m) => {
      const { id, updatedAt, ...rest } = m as unknown as Record<string, unknown>
      void id
      void updatedAt
      return rest as never
    }),
  )
  await pushCollection('library', merged)
}

/** Sync per-series progress (LWW by updatedAt). */
export async function syncProgress(): Promise<void> {
  if (!uid()) return
  const local = (await db.progress.toArray()).map((p) => ({ ...p, id: p.seriesId })) as unknown as Keyed[]
  const remote = await pullCollection('progress')
  const merged = mergeCollections(local, remote)
  await db.progress.bulkPut(
    merged.map((m) => {
      const { id, ...rest } = m as unknown as Record<string, unknown>
      void id
      return rest as never
    }),
  )
  await pushCollection('progress', merged)
}

/** Sync the download LIST (chapter ids) — images stay per device (FR-20 AC4). */
export async function syncDownloadList(): Promise<string[]> {
  if (!uid()) return []
  const localIds = (await db.downloads.where('status').equals('done').toArray()).map((d) => ({
    id: d.chapterId,
    updatedAt: d.createdAt,
    seriesId: d.seriesId,
  })) as unknown as Keyed[]
  const remote = await pullCollection('downloadList')
  const merged = mergeCollections(localIds, remote)
  await pushCollection('downloadList', merged)
  // Return ids present remotely but not downloaded locally (caller wifi-refetches).
  const localDone = new Set(localIds.map((r) => r.id))
  return merged.filter((r) => !localDone.has(r.id)).map((r) => r.id)
}

/** Full sync pass — call on login, on reconnect, and periodically. */
export async function runSync(): Promise<void> {
  if (!isSyncEnabled || !uid()) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  await syncLibrary()
  await syncProgress()
  await syncDownloadList()
}

export { pickNewer }
