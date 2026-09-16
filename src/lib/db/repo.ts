// Thin repository helpers over Dexie. Keep persistence logic here, not in components.

import { db, type Series, type Progress, type ChapterRow } from './schema'

// --- Series ---
export async function putSeries(s: Series) {
  await db.series.put(s)
}
export function getSeries(id: string) {
  return db.series.get(id)
}

// --- Chapters ---
export async function putChapters(rows: ChapterRow[]) {
  await db.chapters.bulkPut(rows)
}
export function getChapters(seriesId: string) {
  return db.chapters.where('seriesId').equals(seriesId).toArray()
}

// --- Progress ---
export async function saveProgress(p: Progress) {
  await db.progress.put(p)
}
export function getProgress(seriesId: string) {
  return db.progress.get(seriesId)
}

// --- Settings (typed key/value) ---
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key)
  return row?.value as T | undefined
}
export async function setSetting<T>(key: string, value: T) {
  await db.settings.put({ key, value })
}

/** Per-series reader memory (FR-11 AC6) is just a namespaced setting. */
export function readerMemoryKey(seriesId: string) {
  return `readerMemory:${seriesId}`
}
