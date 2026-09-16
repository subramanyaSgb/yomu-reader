// Stats persistence. Rollups live under a single settings key (one map; fine for one user —
// ponytail: no dedicated indexed table needed until querying by date range matters).
import { getSetting, setSetting } from '../../lib/db/repo'
import { recordRead, type DailyRollup } from './statsLogic'

const KEY = 'stats:rollups'

export async function getRollups(): Promise<Record<string, DailyRollup>> {
  return (await getSetting<Record<string, DailyRollup>>(KEY)) ?? {}
}

/** Call when a chapter is finished. */
export async function trackChapterRead(seconds: number, genres: string[], now = Date.now()) {
  const current = await getRollups()
  const next = recordRead(current, now, seconds, genres)
  await setSetting(KEY, next)
}
