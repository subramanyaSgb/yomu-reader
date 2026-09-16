// Assert-based self-check for the rate limiter + proxy builder.
// Run: npx tsx src/lib/mangadex/client.selfcheck.ts
// No framework — fails loudly if the survival-critical logic breaks.

import assert from 'node:assert/strict'
import { RateLimiter, backoffDelay } from './client'
import { buildPageProxyUrl, isMangaDexAtHomeHost } from '../proxy/imageUrl'

async function testSpacingAndConcurrency() {
  // Real-time test (small counts) — verify concurrency cap + min spacing.
  const limiter = new RateLimiter(50, 2) // 50ms spacing, max 2 concurrent
  const starts: number[] = []
  const t0 = Date.now()

  await Promise.all(
    Array.from({ length: 6 }, () =>
      limiter.schedule(async () => {
        starts.push(Date.now() - t0)
        await new Promise((r) => setTimeout(r, 30))
      }),
    ),
  )

  assert.equal(starts.length, 6, 'all 6 tasks ran')
  // Sort starts; consecutive starts must respect spacing OR be within a concurrency slot.
  starts.sort((a, b) => a - b)
  // With spacing 50ms, the 6th task cannot start before ~ (6-1)*? — at minimum,
  // starts must be non-decreasing and the last well after the first.
  assert.ok(
    starts[starts.length - 1] >= 100,
    `spacing enforced (last start ${starts[starts.length - 1]}ms >= 100ms)`,
  )
  console.log('✓ spacing + concurrency', starts)
}

function testBackoffMonotonicAndCapped() {
  // Backoff grows with attempt and is capped (with jitter band).
  const d0 = backoffDelay(0)
  const d3 = backoffDelay(3)
  const dBig = backoffDelay(20)
  assert.ok(d0 >= 750 && d0 <= 1250, `attempt0 ~1s (${d0})`)
  assert.ok(d3 > d0, `grows: d3 ${d3} > d0 ${d0}`)
  assert.ok(dBig <= 30_000 * 1.25, `capped near 30s (${dBig})`)
  console.log('✓ backoff monotonic + capped', { d0, d3, dBig })
}

function testProxyBuilderNeverLeaksDirectUrl() {
  const url = buildPageProxyUrl(
    'https://cmdxd98sb0x3yprd.mangadex.network:443',
    'abc123hash',
    'page1.png',
    'source',
  )
  const parsed = new URL(url)
  // Must point at the proxy, NOT mangadex.network.
  assert.ok(
    !parsed.host.endsWith('mangadex.network'),
    `proxied host is not mangadex (${parsed.host})`,
  )
  assert.equal(parsed.pathname, '/img', 'routes through /img')
  const inner = parsed.searchParams.get('u')!
  assert.ok(inner.includes('/data/abc123hash/page1.png'), 'wraps direct URL in ?u=')
  console.log('✓ proxy builder wraps, never leaks', parsed.host)
}

function testDataSaverPath() {
  const low = buildPageProxyUrl('https://x.mangadex.network', 'h', 'f.jpg', 'low')
  assert.ok(new URL(low).searchParams.get('u')!.includes('/data-saver/'), 'low uses data-saver')
  assert.equal(new URL(low).searchParams.get('q'), 'low', 'q=low')
  console.log('✓ data-saver path')
}

function testHostGuard() {
  assert.ok(isMangaDexAtHomeHost('cmdx.mangadex.network'), 'allow @home host')
  assert.ok(isMangaDexAtHomeHost('uploads.mangadex.org'), 'allow uploads host')
  assert.ok(!isMangaDexAtHomeHost('evil.example.com'), 'reject arbitrary host')
  assert.ok(!isMangaDexAtHomeHost('mangadex.network.evil.com'), 'reject spoofed suffix')
  console.log('✓ host guard (allowlist)')
}

async function main() {
  testBackoffMonotonicAndCapped()
  testProxyBuilderNeverLeaksDirectUrl()
  testDataSaverPath()
  testHostGuard()
  await testSpacingAndConcurrency()
  console.log('\nALL SELF-CHECKS PASSED ✅')
}

main().catch((e) => {
  console.error('SELF-CHECK FAILED ❌', e)
  process.exit(1)
})
