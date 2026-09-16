// Reading stats (FR-25) + goals (FR-26). Pure logic over daily rollups. Tested hard —
// streaks and goal-met are easy to get subtly wrong.

export interface DailyRollup {
  date: string // YYYY-MM-DD (local)
  chaptersRead: number
  secondsRead: number
  genres: Record<string, number> // genre -> chapters
}

export function dayKey(ts: number, tzOffsetMinutes = new Date().getTimezoneOffset()): string {
  const local = new Date(ts - tzOffsetMinutes * 60_000)
  return local.toISOString().slice(0, 10)
}

/** Apply a "read a chapter" event onto a rollup map (mutates a copy). */
export function recordRead(
  rollups: Record<string, DailyRollup>,
  ts: number,
  seconds: number,
  genres: string[],
): Record<string, DailyRollup> {
  const key = dayKey(ts)
  const prev = rollups[key] ?? { date: key, chaptersRead: 0, secondsRead: 0, genres: {} }
  const genreTally = { ...prev.genres }
  for (const g of genres) genreTally[g] = (genreTally[g] ?? 0) + 1
  return {
    ...rollups,
    [key]: {
      date: key,
      chaptersRead: prev.chaptersRead + 1,
      secondsRead: prev.secondsRead + seconds,
      genres: genreTally,
    },
  }
}

export function totalChapters(rollups: Record<string, DailyRollup>): number {
  return Object.values(rollups).reduce((s, r) => s + r.chaptersRead, 0)
}

export function totalSeconds(rollups: Record<string, DailyRollup>): number {
  return Object.values(rollups).reduce((s, r) => s + r.secondsRead, 0)
}

/** Subtract one calendar day from a YYYY-MM-DD string (UTC-safe, no tz round-trip). */
function prevDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - 1)
  return dt.toISOString().slice(0, 10)
}

/** Consecutive-day streak ending at `today` (inclusive). Gaps reset it. */
export function currentStreak(
  rollups: Record<string, DailyRollup>,
  today: string,
): number {
  let streak = 0
  let key = today
  // Walk backwards day by day while a rollup with chapters exists.
  for (;;) {
    const r = rollups[key]
    if (r && r.chaptersRead > 0) {
      streak++
      key = prevDay(key)
    } else {
      break
    }
  }
  return streak
}

/** Aggregate genre tallies across all days, sorted desc. */
export function genreBreakdown(rollups: Record<string, DailyRollup>): Array<[string, number]> {
  const total: Record<string, number> = {}
  for (const r of Object.values(rollups)) {
    for (const [g, n] of Object.entries(r.genres)) total[g] = (total[g] ?? 0) + n
  }
  return Object.entries(total).sort((a, b) => b[1] - a[1])
}

/** Goal progress for today (e.g. chapters/day). */
export function goalProgress(
  rollups: Record<string, DailyRollup>,
  today: string,
  targetPerDay: number,
): { done: number; target: number; met: boolean } {
  const done = rollups[today]?.chaptersRead ?? 0
  return { done, target: targetPerDay, met: done >= targetPerDay }
}
