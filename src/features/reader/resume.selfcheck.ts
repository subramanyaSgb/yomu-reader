// Resume throttle + persistence self-check. Run: npx tsx src/features/reader/resume.selfcheck.ts
import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { throttle, makeProgressSaver, restoreProgress } from './resume'

function testThrottleLeadingAndTrailing() {
  let t = 0
  const clock = () => t
  const calls: number[] = []
  const f = throttle((x: number) => calls.push(x), 100, clock)

  f(1) // leading fires immediately
  assert.deepEqual(calls, [1], 'leading call fires')
  f(2) // within window -> pending
  f(3) // replaces pending
  assert.deepEqual(calls, [1], 'no extra call within window')
  f.flush() // trailing flush lands the last
  assert.deepEqual(calls, [1, 3], 'trailing flush lands final value')
  console.log('✓ throttle leading + trailing flush')
}

function testThrottleRespectsInterval() {
  let t = 0
  const clock = () => t
  const calls: number[] = []
  const f = throttle((x: number) => calls.push(x), 100, clock)
  f(1)
  t = 100 // window elapsed
  f(2) // should fire immediately again
  assert.deepEqual(calls, [1, 2], 'fires again after interval elapsed')
  console.log('✓ throttle respects interval')
}

async function testPersistRestore() {
  const saver = makeProgressSaver('s1', 3000)
  saver('ch5', 'scroll', { kind: 'scroll', imageIndex: 3, offsetPct: 0.5 })
  saver.flush()
  // allow the async saveProgress microtask to settle
  await new Promise((r) => setTimeout(r, 10))
  const p = await restoreProgress('s1')
  assert.equal(p?.lastChapterId, 'ch5', 'progress persisted')
  assert.equal(p?.position.kind, 'scroll')
  if (p?.position.kind === 'scroll') assert.equal(p.position.imageIndex, 3)
  console.log('✓ progress persist + restore')
}

async function main() {
  testThrottleLeadingAndTrailing()
  testThrottleRespectsInterval()
  await testPersistRestore()
  console.log('\nRESUME SELF-CHECK PASSED ✅')
}
main().catch((e) => {
  console.error('RESUME SELF-CHECK FAILED ❌', e)
  process.exit(1)
})
