// Pure library logic (FR-23): shelves, collections, sort comparators, unread computation.
// Kept pure for testability; the repo/UI wire it to Dexie.

export type Shelf = 'reading' | 'completed' | 'on-hold' | 'dropped' | 'plan-to-read'
export const SHELVES: Shelf[] = ['reading', 'completed', 'on-hold', 'dropped', 'plan-to-read']

export interface LibraryEntry {
  seriesId: string
  title: string
  shelf: Shelf
  collections: string[]
  lastReadAt: number
  lastUpdatedAt: number
  totalChapters: number
  readChapters: number
}

export type SortKey = 'recent' | 'az' | 'updated'

export function unreadCount(e: LibraryEntry): number {
  return Math.max(0, e.totalChapters - e.readChapters)
}

export function sortComparator(key: SortKey): (a: LibraryEntry, b: LibraryEntry) => number {
  switch (key) {
    case 'az':
      return (a, b) => a.title.localeCompare(b.title)
    case 'updated':
      return (a, b) => b.lastUpdatedAt - a.lastUpdatedAt
    case 'recent':
    default:
      return (a, b) => b.lastReadAt - a.lastReadAt
  }
}

export function onShelf(entries: LibraryEntry[], shelf: Shelf): LibraryEntry[] {
  return entries.filter((e) => e.shelf === shelf)
}

export function inCollection(entries: LibraryEntry[], collection: string): LibraryEntry[] {
  return entries.filter((e) => e.collections.includes(collection))
}

export function addToCollection(e: LibraryEntry, collection: string): LibraryEntry {
  if (e.collections.includes(collection)) return e
  return { ...e, collections: [...e.collections, collection] }
}

export function removeFromCollection(e: LibraryEntry, collection: string): LibraryEntry {
  return { ...e, collections: e.collections.filter((c) => c !== collection) }
}
