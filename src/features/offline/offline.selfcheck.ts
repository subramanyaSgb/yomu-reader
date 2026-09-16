// Offline cache + eviction self-check. Run: npx tsx src/features/offline/offline.selfcheck.ts
import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { db } from '../../lib/db/schema'
import { putBytes, getCachedBlob, fetchAndCache, usage } from './imageCache'
import { evictToBudget } from './eviction'

function blobOf(size: number): Blob {
  return new Blob([new Uint8Array(size)])
}

async function testTierUpgradeNoDowngrade() {
  await db.imageBytes.clear()
  await putBytes('ch1', 0, blobOf(100), 'cache', 1000)
  await putBytes('ch1', 0, blobOf(100), 'download', 2000) // upgrade
  let row = await db.imageBytes.get('ch1:0')
  assert.equal(row?.tier, 'download', 'cache upgraded to download')
  await putBytes('ch1', 0, blobOf(100), 'cache', 3000) // must NOT downgrade
  row = await db.imageBytes.get('ch1:0')
  assert.equal(row?.tier, 'download', 'download never downgraded to cache')
  console.log('✓ tier upgrade-only (download is sticky)')
}

async function testEvictionLRUKeepsDownloads() {
  await db.imageBytes.clear()
  // 3 cache pages (100 each) with increasing lastAccess, + 1 download (100).
  await putBytes('c', 0, blobOf(100), 'cache', 100) // oldest
  await putBytes('c', 1, blobOf(100), 'cache', 200)
  await putBytes('c', 2, blobOf(100), 'cache', 300) // newest
  await putBytes('d', 0, blobOf(100), 'download', 50) // oldest overall but protected

  assert.equal(await usage('cache'), 300)
  assert.equal(await usage('download'), 100)

  // Budget cache to 150 -> must evict the two oldest cache pages (100+100), keep newest.
  const freed = await evictToBudget(150)
  assert.equal(freed, 200, 'freed the two oldest cache pages')
  assert.equal(await usage('cache'), 100, 'newest cache page remains')
  assert.ok(await getCachedBlob('c', 2), 'newest cache page survives')
  assert.equal(await getCachedBlob('c', 0), undefined, 'oldest cache page evicted')
  // Download untouched despite being oldest by lastAccess.
  assert.ok((await db.imageBytes.get('d:0')) !== undefined, 'download NEVER evicted')
  console.log('✓ eviction: LRU over cache only, downloads protected')
}

async function testFetchAndCacheUsesCache() {
  await db.imageBytes.clear()
  let calls = 0
  const fakeFetch = (async () => {
    calls++
    return new Response(blobOf(500), { status: 200 })
  }) as unknown as typeof fetch

  const b1 = await fetchAndCache('x', 0, 'http://proxy/img?u=1', 'cache', fakeFetch)
  const b2 = await fetchAndCache('x', 0, 'http://proxy/img?u=1', 'cache', fakeFetch)
  assert.equal(b1.size, 500)
  assert.equal(b2.size, 500)
  assert.equal(calls, 1, 'second read served from cache, no re-fetch (proxy request saved)')
  console.log('✓ fetchAndCache dedups (byte cache prevents re-hitting proxy)')
}

async function main() {
  await testTierUpgradeNoDowngrade()
  await testEvictionLRUKeepsDownloads()
  await testFetchAndCacheUsesCache()
  console.log('\nOFFLINE SELF-CHECK PASSED ✅')
}
main().catch((e) => {
  console.error('OFFLINE SELF-CHECK FAILED ❌', e)
  process.exit(1)
})
