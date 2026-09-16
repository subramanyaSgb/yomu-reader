// Onboarding gate self-check. Run: npx tsx src/features/onboarding/onboarding.selfcheck.ts
import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { hasSeenOnboarding, markOnboardingSeen, shouldShowOnboarding } from './Onboarding'

function testPureGate() {
  assert.equal(shouldShowOnboarding(undefined), true, 'never seen -> show')
  assert.equal(shouldShowOnboarding(false), true, 'flag false -> show')
  assert.equal(shouldShowOnboarding(true), false, 'seen -> hide')
  console.log('✓ shouldShowOnboarding gate')
}

async function testPersistence() {
  assert.equal(await hasSeenOnboarding(), false, 'fresh install has not seen onboarding')
  await markOnboardingSeen()
  assert.equal(await hasSeenOnboarding(), true, 'marked seen persists')
  console.log('✓ onboarding-seen persistence')
}

async function main() {
  testPureGate()
  await testPersistence()
  console.log('\nONBOARDING SELF-CHECK PASSED ✅')
}
main().catch((e) => {
  console.error('ONBOARDING SELF-CHECK FAILED ❌', e)
  process.exit(1)
})
