// Lightweight per-series meta captured whenever chapters are loaded (detail/reader),
// so shelf cards can show read-% and last-read chapter without any network calls.

import { getSetting, setSetting } from '../../lib/db/repo'

export interface SeriesMeta {
  total?: number             // known chapter count
  lastNumber?: string | null // last chapter number opened in the reader
}

const key = (seriesId: string) => `seriesMeta:${seriesId}`

export async function getSeriesMeta(seriesId: string): Promise<SeriesMeta | undefined> {
  return getSetting<SeriesMeta>(key(seriesId))
}

export async function saveSeriesMeta(seriesId: string, patch: SeriesMeta): Promise<void> {
  const cur = (await getSetting<SeriesMeta>(key(seriesId))) ?? {}
  await setSetting(key(seriesId), { ...cur, ...patch })
}
