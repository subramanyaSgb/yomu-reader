// Download management: usage, per-series and global cleanup, downloaded-set lookups.

import { db } from '../../lib/db/schema'

export function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`
  if (n >= 1024 ** 2) return `${Math.round(n / 1024 ** 2)} MB`
  return `${Math.round(n / 1024)} KB`
}

export async function downloadsSummary(): Promise<{ chapters: number; bytes: number }> {
  const rows = await db.downloads.where('status').equals('done').toArray()
  const bytes = (await db.imageBytes.toArray()).reduce((s, r) => s + r.bytes, 0)
  return { chapters: rows.length, bytes }
}

/** Chapter ids downloaded for one series. */
export async function downloadedChapterIds(seriesId: string): Promise<Set<string>> {
  const rows = await db.downloads.where('seriesId').equals(seriesId).toArray()
  return new Set(rows.filter(r => r.status === 'done').map(r => r.chapterId))
}

export async function clearSeriesDownloads(seriesId: string): Promise<void> {
  const rows = await db.downloads.where('seriesId').equals(seriesId).toArray()
  for (const r of rows) {
    await db.imageBytes.where('chapterId').equals(r.chapterId).delete()
  }
  await db.downloads.where('seriesId').equals(seriesId).delete()
}

export async function clearChapterDownload(chapterId: string): Promise<void> {
  await db.imageBytes.where('chapterId').equals(chapterId).delete()
  await db.downloads.delete(chapterId)
}

export async function clearAllDownloads(): Promise<void> {
  await db.imageBytes.clear()
  await db.downloads.clear()
}
