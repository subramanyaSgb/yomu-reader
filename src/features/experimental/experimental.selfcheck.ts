// Phase 7 experimental self-check. Run: npx tsx src/features/experimental/experimental.selfcheck.ts
import assert from 'node:assert/strict'
import { isEnabled } from './flags'
import { bestMatch, resolveMatch, type Candidate } from './comickMatch'
import { regionAtPoint, nextRegion, zoomToRegion, type BubbleRegion } from './bubbleZoom'
import { maybeUpscale } from './upscale'

function testFlagGating() {
  // With override off, features are disabled (mirrors default-off env).
  assert.equal(isEnabled('comick', { comick: false }), false, 'flag off')
  assert.equal(isEnabled('bubble', { bubble: true }), true, 'override on')
  console.log('✓ flag gating (default off, override honored)')
}

function testComickMatch() {
  const candidates: Candidate[] = [
    { id: 'c1', title: 'Solo Leveling', author: 'Chugong' },
    { id: 'c2', title: 'Omniscient Reader', author: 'Sing Shong' },
  ]
  const m = bestMatch('Solo Leveling (Official)', 'Chugong', candidates)
  assert.equal(m?.candidate.id, 'c1', 'fuzzy matches Solo Leveling')
  assert.ok(m!.score > 0.6, 'score above threshold w/ author boost')

  const none = bestMatch('Totally Different Series', undefined, candidates)
  assert.equal(none, null, 'no false match')

  // Manual link overrides fuzzy.
  const resolved = resolveMatch('c2', candidates, m)
  assert.equal(resolved?.id, 'c2', 'manual link wins over fuzzy')
  console.log('✓ comick match (fuzzy + author boost + manual override)')
}

function testBubbleZoom() {
  const regions: BubbleRegion[] = [
    { x: 0.1, y: 0.1, w: 0.2, h: 0.1, order: 0 },
    { x: 0.5, y: 0.5, w: 0.3, h: 0.2, order: 1 },
  ]
  // Tap inside region 1.
  const hit = regionAtPoint(regions, 0.6, 0.55)
  assert.equal(hit?.order, 1, 'tap inside picks region 1')
  // Tap in empty space picks nearest.
  const near = regionAtPoint(regions, 0.12, 0.12)
  assert.equal(near?.order, 0, 'tap near region 0')
  // No regions -> null (caller falls back to plain tap-zoom).
  assert.equal(regionAtPoint([], 0.5, 0.5), null, 'no regions -> null fallback')

  // Sequential next wraps.
  assert.equal(nextRegion(regions, 0)?.order, 1, 'next after 0 is 1')
  assert.equal(nextRegion(regions, 1)?.order, 0, 'next after last wraps to first')

  // Zoom transform frames the bubble at scale > 1.
  const t = zoomToRegion(regions[1], 400, 800)
  assert.ok(t.scale > 1, 'zooms in on region')
  console.log('✓ bubble zoom (pick/next/zoom + empty fallback)')
}

async function testUpscaleNoop() {
  // Flag off -> returns original.
  assert.equal(await maybeUpscale('img.png', { upscale: false }), 'img.png', 'no upscale when off')
  // Flag on but no model URL -> still original (graceful).
  assert.equal(await maybeUpscale('img.png', { upscale: true }), 'img.png', 'no model -> no-op')
  console.log('✓ upscale no-op without model (never breaks)')
}

async function main() {
  testFlagGating()
  testComickMatch()
  testBubbleZoom()
  await testUpscaleNoop()
  console.log('\nEXPERIMENTAL SELF-CHECK PASSED ✅')
}
main().catch((e) => {
  console.error('EXPERIMENTAL SELF-CHECK FAILED ❌', e)
  process.exit(1)
})
