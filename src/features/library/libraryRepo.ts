// Library repository (FR-23). Persists shelves/collections/notify to Dexie; converts
// to/from the pure LibraryEntry used by libraryLogic.

import { db, type LibraryRow, type Shelf } from '../../lib/db/schema'
import type { LibraryEntry } from './libraryLogic'

function toEntry(r: LibraryRow): LibraryEntry {
  return {
    seriesId: r.seriesId,
    title: r.title,
    shelf: r.shelf,
    collections: r.collections,
    lastReadAt: r.lastReadAt,
    lastUpdatedAt: r.lastUpdatedAt,
    totalChapters: r.totalChapters,
    readChapters: r.readChapters,
  }
}

export async function getLibrary(): Promise<LibraryEntry[]> {
  return (await db.library.toArray()).map(toEntry)
}

export async function isInLibrary(seriesId: string): Promise<boolean> {
  return (await db.library.get(seriesId)) !== undefined
}

export async function addToLibrary(
  seriesId: string,
  title: string,
  shelf: Shelf = 'reading',
) {
  const now = Date.now()
  await db.library.put({
    seriesId,
    title,
    shelf,
    collections: [],
    notify: false,
    lastReadAt: now,
    lastUpdatedAt: now,
    totalChapters: 0,
    readChapters: 0,
  })
}

export async function removeFromLibrary(seriesId: string) {
  await db.library.delete(seriesId)
}

export async function setShelf(seriesId: string, shelf: Shelf) {
  await db.library.update(seriesId, { shelf })
}

export async function setNotify(seriesId: string, notify: boolean) {
  await db.library.update(seriesId, { notify })
}

export async function setCollections(seriesId: string, collections: string[]) {
  await db.library.update(seriesId, { collections })
}

export async function updateCounts(
  seriesId: string,
  totalChapters: number,
  readChapters: number,
) {
  await db.library.update(seriesId, { totalChapters, readChapters, lastUpdatedAt: Date.now() })
}
