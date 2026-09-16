// Stats + backup self-check. Run: npx tsx src/features/stats/stats.selfcheck.ts
import assert from 'node:assert/strict'
import {
  recordRead,
  totalChapters,
  totalSeconds,
  currentStreak,
  genreBreakdown,
  goalProgress,
  type DailyRollup,
} from './statsLogic'
import { serializeBackup, parseBackup } from './backup'

function rollup(date: string, ch: number, genres: Record<string, number> = {}): DailyRollup {
  return { date, chaptersRead: ch, secondsRead: ch * 60, genres }
}

function testRecordAndTotals() {
  let r: Record<string, DailyRollup> = {}
  const ts = new Date('2026-09-16T10:00:00').getTime()
  r = recordRead(r, ts, 120, ['Action', 'Fantasy'])
  r = recordRead(r, ts, 90, ['Action'])
  assert.equal(totalChapters(r), 2, '2 chapters recorded')
  assert.equal(totalSeconds(r), 210, 'time accrued')
  const gb = genreBreakdown(r)
  assert.deepEqual(gb[0], ['Action', 2], 'Action leads genre breakdown')
  console.log('✓ record + totals + genre breakdown')
}

function testStreak() {
  const r: Record<string, DailyRollup> = {
    '2026-09-14': rollup('2026-09-14', 1),
    '2026-09-15': rollup('2026-09-15', 2),
    '2026-09-16': rollup('2026-09-16', 1),
  }
  assert.equal(currentStreak(r, '2026-09-16'), 3, '3-day streak')

  // Gap breaks it: no reading on the 15th.
  const gap: Record<string, DailyRollup> = {
    '2026-09-14': rollup('2026-09-14', 1),
    '2026-09-16': rollup('2026-09-16', 1),
  }
  assert.equal(currentStreak(gap, '2026-09-16'), 1, 'gap resets streak to 1')

  // No reading today -> 0.
  assert.equal(currentStreak(r, '2026-09-17'), 0, 'no read today = 0 streak')
  console.log('✓ streak (consecutive, gap-reset, today-required)')
}

function testGoal() {
  const r = { '2026-09-16': rollup('2026-09-16', 3) }
  assert.deepEqual(goalProgress(r, '2026-09-16', 3), { done: 3, target: 3, met: true }, 'goal met')
  assert.equal(goalProgress(r, '2026-09-16', 5).met, false, 'goal not met')
  assert.equal(goalProgress(r, '2026-09-17', 3).done, 0, 'no reading today')
  console.log('✓ goal progress')
}

function testBackupRoundTrip() {
  const data = {
    library: [{ seriesId: 's1', shelf: 'reading' }],
    progress: [{ seriesId: 's1', lastChapterId: 'c5' }],
    settings: [{ key: 'theme', value: 'sepia' }],
    stats: [rollup('2026-09-16', 2)],
  }
  const json = serializeBackup(data, 111)
  const parsed = parseBackup(json)
  assert.equal(parsed.version, 1)
  assert.equal(parsed.exportedAt, 111)
  assert.equal((parsed.library[0] as { seriesId: string }).seriesId, 's1', 'library survived')
  assert.equal((parsed.settings[0] as { value: string }).value, 'sepia', 'settings survived')
  assert.throws(() => parseBackup('{"version":2}'), /unsupported/, 'rejects bad version')
  console.log('✓ backup serialize/parse round-trip + version guard')
}

testRecordAndTotals()
testStreak()
testGoal()
testBackupRoundTrip()
console.log('\nSTATS/BACKUP SELF-CHECK PASSED ✅')
