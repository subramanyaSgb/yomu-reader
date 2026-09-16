// Paged nav self-check. Run: npx tsx src/features/reader/pagedNav.selfcheck.ts
import assert from 'node:assert/strict'
import { isAdvance, nextIndex, chapterCrossing } from './pagedNav'

function testRTLAdvance() {
  // Manga (RTL): tapping LEFT edge advances.
  assert.equal(isAdvance('left', 'rtl'), true, 'RTL left = next')
  assert.equal(isAdvance('right', 'rtl'), false, 'RTL right = prev')
  assert.equal(isAdvance('right', 'ltr'), true, 'LTR right = next')
  assert.equal(isAdvance('left', 'ltr'), false, 'LTR left = prev')
  console.log('✓ RTL/LTR advance direction')
}

function testNextIndexClamps() {
  assert.equal(nextIndex(0, 10, 'left', 'rtl'), 1, 'advance in RTL')
  assert.equal(nextIndex(0, 10, 'right', 'rtl'), 0, 'cannot go before first')
  assert.equal(nextIndex(9, 10, 'left', 'rtl'), 9, 'cannot go past last')
  assert.equal(nextIndex(5, 10, 'right', 'ltr'), 6, 'LTR right = advance')
  assert.equal(nextIndex(5, 10, 'left', 'ltr'), 4, 'LTR left = retreat')
  console.log('✓ index clamps at bounds')
}

function testChapterCrossing() {
  assert.equal(chapterCrossing(9, 10, 'left', 'rtl'), 'next-chapter', 'advance off last')
  assert.equal(chapterCrossing(0, 10, 'right', 'rtl'), 'prev-chapter', 'retreat off first')
  assert.equal(chapterCrossing(5, 10, 'left', 'rtl'), null, 'mid-chapter no crossing')
  console.log('✓ chapter boundary crossing')
}

testRTLAdvance()
testNextIndexClamps()
testChapterCrossing()
console.log('\nPAGED NAV SELF-CHECK PASSED ✅')
