// Stats display (FR-25): chapters, streak, time, genre breakdown. Shown in Profile.
import { useEffect, useState } from 'react'
import { getRollups } from './statsRepo'
import {
  totalChapters,
  totalSeconds,
  currentStreak,
  genreBreakdown,
  dayKey,
  type DailyRollup,
} from './statsLogic'

export default function StatsScreen() {
  const [rollups, setRollups] = useState<Record<string, DailyRollup>>({})
  useEffect(() => {
    getRollups().then(setRollups)
  }, [])

  const today = dayKey(Date.now())
  const hours = Math.round((totalSeconds(rollups) / 3600) * 10) / 10
  const genres = genreBreakdown(rollups).slice(0, 6)
  const maxGenre = genres[0]?.[1] ?? 1

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Card label="Chapters" value={String(totalChapters(rollups))} />
        <Card label="Streak" value={`${currentStreak(rollups, today)}d`} />
        <Card label="Hours" value={String(hours)} />
      </div>
      {genres.length > 0 && (
        <div className="rounded-lg bg-neutral-800 p-3">
          <div className="mb-2 text-sm text-neutral-400">Genres</div>
          {genres.map(([g, n]) => (
            <div key={g} className="mb-1">
              <div className="flex justify-between text-xs text-neutral-300">
                <span>{g}</span>
                <span>{n}</span>
              </div>
              <div className="h-1.5 rounded bg-neutral-700">
                <div
                  className="h-1.5 rounded bg-violet-500"
                  style={{ width: `${(n / maxGenre) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-800 p-3 text-center">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  )
}
