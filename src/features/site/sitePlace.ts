// Where the reader is in a web: series that Yomu reads as site pages (Phase 19).
// Stored as ordinary Progress so shelves, backup and resume treat it like any series.

import { saveProgress } from '../../lib/db/repo'
import { saveSeriesMeta } from '../shelf/seriesMeta'
import { chapterNumberOf } from '../shelf/addSeries'

/** Stores a page link as the resume point of a site/external series. */
export async function saveSitePlace(seriesId: string, url: string): Promise<void> {
  await saveProgress({
    seriesId, lastChapterId: url, mode: 'scroll',
    position: { kind: 'scroll', imageIndex: 0, offsetPct: 0 },
    updatedAt: Date.now(),
  })
  const number = chapterNumberOf(url)
  if (number != null) await saveSeriesMeta(seriesId, { lastNumber: number })
}
