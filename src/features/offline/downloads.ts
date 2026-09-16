// Download manager (FR-14): single / range / series / auto-keep-next-N. Downloaded pages
// are stored at tier 'download' (permanent). Requests persistent storage on first download.

import { db, type DownloadScope } from '../../lib/db/schema'
import { fetchAndCache } from './imageCache'

let persistRequested = false
async function ensurePersistent() {
  if (persistRequested) return
  persistRequested = true
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    try {
      await navigator.storage.persist() // protects tier='download' from eviction
    } catch {
      /* best effort */
    }
  }
}

export interface PageSource {
  chapterId: string
  seriesId: string
  proxyUrls: string[] // resolved proxied page URLs for the chapter
}

/** Download one chapter's pages permanently, updating a Download progress row. */
export async function downloadChapter(
  src: PageSource,
  scope: DownloadScope = 'single',
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await ensurePersistent()
  const now = Date.now()
  await db.downloads.put({
    chapterId: src.chapterId,
    seriesId: src.seriesId,
    scope,
    status: 'downloading',
    pagesTotal: src.proxyUrls.length,
    pagesDone: 0,
    bytes: 0,
    createdAt: now,
  })

  let bytes = 0
  for (let i = 0; i < src.proxyUrls.length; i++) {
    try {
      const blob = await fetchAndCache(src.chapterId, i, src.proxyUrls[i], 'download', fetchImpl)
      bytes += blob.size
      await db.downloads.update(src.chapterId, { pagesDone: i + 1, bytes })
    } catch {
      await db.downloads.update(src.chapterId, { status: 'error' })
      return
    }
  }
  await db.downloads.update(src.chapterId, { status: 'done' })
}

/** Download a list of chapters (used by range / series / auto). */
export async function downloadMany(
  sources: PageSource[],
  scope: DownloadScope,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  for (const s of sources) {
    const existing = await db.downloads.get(s.chapterId)
    if (existing?.status === 'done') continue // idempotent
    await downloadChapter(s, scope, fetchImpl)
  }
}

export async function isDownloaded(chapterId: string): Promise<boolean> {
  const d = await db.downloads.get(chapterId)
  return d?.status === 'done'
}

/** Select the next N not-yet-downloaded chapters from an ordered id list, from a start index. */
export async function nextNToDownload(
  orderedChapterIds: string[],
  startIndex: number,
  n: number,
): Promise<string[]> {
  const out: string[] = []
  for (let i = startIndex; i < orderedChapterIds.length && out.length < n; i++) {
    if (!(await isDownloaded(orderedChapterIds[i]))) out.push(orderedChapterIds[i])
  }
  return out
}
