// LWW merge self-check. Run: npx tsx src/features/sync/merge.selfcheck.ts
import assert from 'node:assert/strict'
import { mergeRecord, mergeCollections, pickNewer, type Keyed } from './merge'

function testMergeRecord() {
  assert.equal(mergeRecord(undefined, { updatedAt: 5 })?.updatedAt, 5, 'remote when no local')
  assert.equal(mergeRecord({ updatedAt: 5 }, undefined)?.updatedAt, 5, 'local when no remote')
  assert.equal(mergeRecord({ updatedAt: 3 }, { updatedAt: 9 })?.updatedAt, 9, 'newer remote wins')
  assert.equal(mergeRecord({ updatedAt: 9 }, { updatedAt: 3 })?.updatedAt, 9, 'newer local wins')
  // tie keeps local
  const l = { updatedAt: 5, tag: 'L' }
  const r = { updatedAt: 5, tag: 'R' }
  assert.equal((mergeRecord(l, r) as typeof l).tag, 'L', 'tie keeps local (stable)')
  console.log('✓ mergeRecord LWW')
}

function testMergeCollections() {
  const local: Keyed[] = [
    { id: 'a', updatedAt: 10 },
    { id: 'b', updatedAt: 5 },
  ]
  const remote: Keyed[] = [
    { id: 'a', updatedAt: 3 }, // older -> local a kept
    { id: 'b', updatedAt: 20 }, // newer -> remote b wins
    { id: 'c', updatedAt: 1 }, // new -> added
  ]
  const merged = mergeCollections(local, remote)
  const map = Object.fromEntries(merged.map((r) => [r.id, r.updatedAt]))
  assert.equal(map['a'], 10, 'a: local (newer) kept')
  assert.equal(map['b'], 20, 'b: remote (newer) wins')
  assert.equal(map['c'], 1, 'c: added from remote')
  console.log('✓ mergeCollections LWW per-id')
}

function testTombstoneDeleteWins() {
  const local: Keyed[] = [{ id: 'x', updatedAt: 5 }]
  const remote: Keyed[] = [{ id: 'x', updatedAt: 9, deleted: true }] // delete after edit
  const merged = mergeCollections(local, remote)
  assert.ok(!merged.find((r) => r.id === 'x'), 'newer delete removes x from live view')

  const local2: Keyed[] = [{ id: 'y', updatedAt: 9 }] // edit after delete
  const remote2: Keyed[] = [{ id: 'y', updatedAt: 5, deleted: true }]
  const merged2 = mergeCollections(local2, remote2)
  assert.ok(merged2.find((r) => r.id === 'y'), 'newer edit beats older delete')
  console.log('✓ tombstone delete respects LWW ordering')
}

function testPickNewer() {
  assert.equal(pickNewer({ updatedAt: 1 }, { updatedAt: 2 }).updatedAt, 2)
  console.log('✓ pickNewer')
}

testMergeRecord()
testMergeCollections()
testTombstoneDeleteWins()
testPickNewer()
console.log('\nSYNC MERGE SELF-CHECK PASSED ✅')
