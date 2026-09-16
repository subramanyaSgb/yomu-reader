// Zoom math self-check. Run: npx tsx src/features/reader/zoom/zoomMath.selfcheck.ts
import assert from 'node:assert/strict'
import { identity, cycleScale, zoomToPoint, clampPan, ZOOM_LEVELS } from './zoomMath'

function testCycle() {
  assert.equal(cycleScale(1), 2)
  assert.equal(cycleScale(2), 3)
  assert.equal(cycleScale(3), 1, 'wraps back to 1x')
  console.log('✓ zoom level cycle 1->2->3->1')
}

function testAnchorStaysPut() {
  // Zooming to 2x at point (100,50): that point must map to itself after transform.
  const t = zoomToPoint(identity(), 2, 100, 50)
  // apply transform to the anchor in image space: screen = translate + scale*imagePoint.
  // Anchor invariance means: px == tx + scale*(px_image). Simplest check: the visual
  // position of the anchor is unchanged => tx + scale*px_orig... we verify via inverse:
  const screenX = t.tx + t.scale * 100
  const screenY = t.ty + t.scale * 50
  // With our formula and oldScale=1, anchor maps to px*(scale) + (px - scale*px) = px.
  // Recompute expected: tx = px - ratio*(px - 0) = 100 - 2*100 = -100 => screenX = -100 + 2*100 = 100 ✓
  assert.ok(Math.abs(screenX - 100) < 1e-6, `anchor x stays (${screenX})`)
  assert.ok(Math.abs(screenY - 50) < 1e-6, `anchor y stays (${screenY})`)
  console.log('✓ tap point stays anchored on zoom')
}

function testClampWithinBounds() {
  // 2x zoom in a 300x600 container. Panning far right should clamp tx to 0 (no empty gap).
  const clamped = clampPan({ scale: 2, tx: 999, ty: 999 }, 300, 600)
  assert.equal(clamped.tx, 0, 'tx clamped to right edge (0)')
  assert.equal(clamped.ty, 0, 'ty clamped to top edge (0)')
  // Panning far negative clamps to the min (container - container*scale).
  const clamped2 = clampPan({ scale: 2, tx: -9999, ty: -9999 }, 300, 600)
  assert.equal(clamped2.tx, -300, 'tx clamped to left edge')
  assert.equal(clamped2.ty, -600, 'ty clamped to bottom edge')
  console.log('✓ pan clamped within image bounds')
}

function testResetAtScale1() {
  const c = clampPan({ scale: 1, tx: 50, ty: 50 }, 300, 600)
  assert.deepEqual(c, { scale: 1, tx: 0, ty: 0 }, 'no pan at 1x')
  console.log('✓ pan resets at 1x')
}

testCycle()
testAnchorStaysPut()
testClampWithinBounds()
testResetAtScale1()
assert.deepEqual([...ZOOM_LEVELS], [1, 2, 3])
console.log('\nZOOM MATH SELF-CHECK PASSED ✅')
