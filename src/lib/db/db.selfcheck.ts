// DB layer self-check. Run: npx tsx src/lib/db/db.selfcheck.ts
// Uses fake-indexeddb so it runs headless in Node.

import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import {
  putSeries,
  getSeries,
  saveProgress,
  getProgress,
  setSetting,
  getSetting,
  readerMemoryKey,
} from './repo'

async function main() {
  const now = 1_700_000_000_000

  await putSeries({
    id: 'md-123',
    source: 'mangadex',
    title: 'Test Series',
    type: 'manhwa',
    addedAt: now,
    updatedAt: now,
  })
  const s = await getSeries('md-123')
  assert.equal(s?.title, 'Test Series', 'series round-trips')
  assert.equal(s?.type, 'manhwa')
  console.log('✓ series put/get')

  await saveProgress({
    seriesId: 'md-123',
    lastChapterId: 'ch-9',
    mode: 'scroll',
    position: { kind: 'scroll', imageIndex: 4, offsetPct: 0.42 },
    updatedAt: now,
  })
  const p = await getProgress('md-123')
  assert.equal(p?.lastChapterId, 'ch-9')
  assert.equal(p?.position.kind, 'scroll')
  if (p?.position.kind === 'scroll') {
    assert.equal(p.position.imageIndex, 4)
    assert.ok(Math.abs(p.position.offsetPct - 0.42) < 1e-9)
  }
  console.log('✓ progress put/get (scroll anchor preserved)')

  const key = readerMemoryKey('md-123')
  await setSetting(key, { mode: 'paged', rtl: true, fit: 'width' })
  const mem = await getSetting<{ mode: string; rtl: boolean; fit: string }>(key)
  assert.equal(mem?.rtl, true, 'reader memory round-trips')
  assert.equal(mem?.fit, 'width')
  console.log('✓ settings / reader-memory put/get')

  console.log('\nDB SELF-CHECK PASSED ✅')
}

main().catch((e) => {
  console.error('DB SELF-CHECK FAILED ❌', e)
  process.exit(1)
})
