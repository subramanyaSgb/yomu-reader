// Bookmarks: exact spots ("that panel in ch. 57") saved from the reader HUD,
// listed on the series page, reopened at the precise position.

import { getSetting, setSetting } from '../../lib/db/repo'

export interface Bookmark {
  seriesId: string
  chapterId: string
  number: string | null
  // Exact position: scroll anchor or page index (same shape the reader restores).
  position:
    | { kind: 'scroll'; imageIndex: number; offsetPct: number }
    | { kind: 'paged'; pageIndex: number }
  at: number
}

const KEY = 'bookmarks:v1'

export async function getBookmarks(seriesId?: string): Promise<Bookmark[]> {
  const all = (await getSetting<Bookmark[]>(KEY)) ?? []
  return seriesId ? all.filter(b => b.seriesId === seriesId) : all
}

export async function addBookmark(b: Omit<Bookmark, 'at'>): Promise<void> {
  const all = (await getSetting<Bookmark[]>(KEY)) ?? []
  all.push({ ...b, at: Date.now() })
  await setSetting(KEY, all.slice(-300))
}

export async function removeBookmark(seriesId: string, at: number): Promise<void> {
  const all = (await getSetting<Bookmark[]>(KEY)) ?? []
  await setSetting(KEY, all.filter(b => !(b.seriesId === seriesId && b.at === at)))
}
