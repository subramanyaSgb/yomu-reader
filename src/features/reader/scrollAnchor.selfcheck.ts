// Scroll anchor self-check. Run: npx tsx src/features/reader/scrollAnchor.selfcheck.ts
import assert from 'node:assert/strict'
import { toAnchor, fromAnchor, type ImageBox } from './scrollAnchor'

// 3 images of heights 1000, 1500, 800 stacked from top.
const boxes: ImageBox[] = [
  { top: 0, height: 1000 },
  { top: 1000, height: 1500 },
  { top: 2500, height: 800 },
]

function testRoundTrip() {
  // Halfway through image 1 (the 1500px one) => scrollTop 1750.
  const a = toAnchor(1750, boxes)
  assert.equal(a.imageIndex, 1, 'in image 1')
  assert.ok(Math.abs(a.offsetPct - 0.5) < 1e-9, 'halfway')
  const back = fromAnchor(a, boxes)
  assert.equal(back, 1750, 'round-trips to same scrollTop')
  console.log('✓ anchor round-trip (same layout)')
}

function testSurvivesRelayout() {
  const a = toAnchor(1750, boxes) // image 1, 50%
  // Simulate reload where image 0 loaded TALLER (1200 instead of 1000), shifting everything.
  const relaid: ImageBox[] = [
    { top: 0, height: 1200 },
    { top: 1200, height: 1500 },
    { top: 2700, height: 800 },
  ]
  const restored = fromAnchor(a, relaid)
  // Should still be 50% into image 1 => 1200 + 0.5*1500 = 1950, NOT the stale 1750.
  assert.equal(restored, 1950, 'anchor tracks image, not stale pixels')
  console.log('✓ anchor survives re-layout (pixel offset would have been wrong)')
}

function testEdges() {
  assert.deepEqual(toAnchor(0, boxes), { imageIndex: 0, offsetPct: 0 }, 'top')
  const last = toAnchor(99999, boxes)
  assert.equal(last.imageIndex, 2, 'past end clamps to last image')
  assert.deepEqual(toAnchor(0, []), { imageIndex: 0, offsetPct: 0 }, 'empty safe')
  console.log('✓ edge cases (top / past-end / empty)')
}

testRoundTrip()
testSurvivesRelayout()
testEdges()
console.log('\nSCROLL ANCHOR SELF-CHECK PASSED ✅')
