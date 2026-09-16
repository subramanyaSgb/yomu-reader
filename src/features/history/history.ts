// Reading history: chronological log of chapters opened, capped. Appended by the
// reader whenever the current chapter changes.

import { getSetting, setSetting } from '../../lib/db/repo'

export interface HistoryEntry {
  seriesId: string
  title: string
  chapterId: string
  number: string | null
  at: number
}

const KEY = 'history:v1'
const CAP = 500

export async function getHistory(): Promise<HistoryEntry[]> {
  return (await getSetting<HistoryEntry[]>(KEY)) ?? []
}

export async function appendHistory(entry: Omit<HistoryEntry, 'at'>): Promise<void> {
  const list = await getHistory()
  const last = list[list.length - 1]
  // Collapse rapid re-entries of the same chapter (scroll jitter, restore).
  if (last && last.chapterId === entry.chapterId && Date.now() - last.at < 10 * 60 * 1000) return
  list.push({ ...entry, at: Date.now() })
  await setSetting(KEY, list.slice(-CAP))
}

export async function clearHistory(): Promise<void> {
  await setSetting(KEY, [])
}
