// Version resolver self-check — the highest-logic module, tested hard.
// Run: npx tsx src/features/reader/versionResolver.selfcheck.ts

import assert from 'node:assert/strict'
import {
  resolveChapters,
  inferPreferredGroup,
  type RawChapter,
} from './versionResolver'

function ch(
  id: string,
  number: string | null,
  group: string,
  likes: number,
  pages = 20,
  publishAt = '2026-01-01T00:00:00Z',
): RawChapter {
  return { id, number, group, likes, pages, publishAt }
}

// Synthetic feed:
//  ch1: GroupA(100) vs GroupB(50)  -> prefer-group A wins; by-likes A also wins
//  ch2: only GroupB(10)            -> gap-fill to B (A didn't release it)
//  ch3: GroupA(5) vs GroupB(80)    -> prefer-group A wins (consistency); by-likes B wins
//  ch10: GroupB(1)                 -> ordering: 10 must come AFTER 3 (numeric sort)
const feed: RawChapter[] = [
  ch('a1', '1', 'GroupA', 100),
  ch('b1', '1', 'GroupB', 50),
  ch('b2', '2', 'GroupB', 10),
  ch('a3', '3', 'GroupA', 5),
  ch('b3', '3', 'GroupB', 80),
  ch('b10', '10', 'GroupB', 1),
]

function testPreferOneGroup() {
  const r = resolveChapters(feed, 'GroupA')
  const map = Object.fromEntries(r.map((c) => [c.number, c.selectedVersionId]))
  assert.equal(map['1'], 'a1', 'ch1 uses preferred GroupA')
  assert.equal(map['2'], 'b2', 'ch2 gap-fills to GroupB (A absent)')
  assert.equal(map['3'], 'a3', 'ch3 stays on preferred GroupA even though B has more likes')
  console.log('✓ prefer-one-group + gap-fill')
}

function testByLikesWhenNoPreference() {
  const r = resolveChapters(feed) // no preferred group
  const map = Object.fromEntries(r.map((c) => [c.number, c.selectedVersionId]))
  assert.equal(map['1'], 'a1', 'ch1 -> A (100 likes)')
  assert.equal(map['3'], 'b3', 'ch3 -> B (80 likes) when no preference')
  console.log('✓ likes-ranked selection without preference')
}

function testNumericOrdering() {
  const r = resolveChapters(feed, 'GroupA')
  const nums = r.map((c) => c.number)
  assert.deepEqual(nums, ['1', '2', '3', '10'], 'numeric order, not lexical (10 last)')
  console.log('✓ numeric chapter ordering')
}

function testVersionPoolForSwitcher() {
  const r = resolveChapters(feed, 'GroupA')
  const ch3 = r.find((c) => c.number === '3')!
  assert.equal(ch3.versions.length, 2, 'ch3 pool has both versions for the switcher')
  assert.equal(ch3.versions[0].id, 'b3', 'pool is best-first (B 80 likes leads)')
  console.log('✓ version pool exposed, best-first')
}

function testInferPreferredGroup() {
  // GroupB covers 1,2,3,10 (4); GroupA covers 1,3 (2). B wins.
  assert.equal(inferPreferredGroup(feed), 'GroupB', 'infers widest-coverage group')
  console.log('✓ infer preferred group by coverage')
}

function testTiebreakCoverageThenRecency() {
  const tie: RawChapter[] = [
    ch('x', '5', 'G1', 10, 15, '2026-01-01T00:00:00Z'),
    ch('y', '5', 'G2', 10, 30, '2026-01-01T00:00:00Z'), // same likes, more pages -> wins
    ch('z', '5', 'G3', 10, 30, '2026-06-01T00:00:00Z'), // same likes+pages, newer -> wins overall
  ]
  const r = resolveChapters(tie)
  assert.equal(r[0].selectedVersionId, 'z', 'ties break by pages then recency')
  console.log('✓ tiebreak: likes -> pages -> recency')
}

testPreferOneGroup()
testByLikesWhenNoPreference()
testNumericOrdering()
testVersionPoolForSwitcher()
testInferPreferredGroup()
testTiebreakCoverageThenRecency()
console.log('\nVERSION RESOLVER SELF-CHECK PASSED ✅')
