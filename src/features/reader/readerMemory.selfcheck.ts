// Reader-memory persistence self-check (FR-11 AC6). Run:
// npx tsx src/features/reader/readerMemory.selfcheck.ts
import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { getSetting, setSetting, readerMemoryKey } from '../../lib/db/repo'
import { DEFAULT_MEMORY, type ReaderMemory } from './useReaderMemory'

async function main() {
  const key = readerMemoryKey('series-42')

  // Nothing saved yet -> undefined, so a consumer falls back to DEFAULT_MEMORY.
  const initial = await getSetting<ReaderMemory>(key)
  assert.equal(initial, undefined, 'no memory before first save')

  // Simulate the update() path (merge onto defaults, persist).
  const next = { ...DEFAULT_MEMORY, rtl: false, fit: 'height' as const, brightness: 0.3 }
  await setSetting(key, next)

  const loaded = await getSetting<ReaderMemory>(key)
  assert.equal(loaded?.rtl, false, 'rtl persisted')
  assert.equal(loaded?.fit, 'height', 'fit persisted')
  assert.ok(Math.abs((loaded?.brightness ?? 0) - 0.3) < 1e-9, 'brightness persisted')

  // Different series must not collide.
  const other = await getSetting<ReaderMemory>(readerMemoryKey('series-99'))
  assert.equal(other, undefined, 'per-series isolation')

  console.log('✓ reader memory round-trip + per-series isolation')
  console.log('\nREADER MEMORY SELF-CHECK PASSED ✅')
}

main().catch((e) => {
  console.error('FAILED ❌', e)
  process.exit(1)
})
