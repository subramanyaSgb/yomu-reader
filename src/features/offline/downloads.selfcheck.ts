// Downloads self-check. Run: npx tsx src/features/offline/downloads.selfcheck.ts
import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { db } from '../../lib/db/schema'
import { downloadChapter, isDownloaded, nextNToDownload } from './downloads'

function fakeFetch(): typeof fetch {
  return (async () => new Response(new Blob([new Uint8Array(200)]), { status: 200 })) as unknown as typeof fetch
}

async function testDownloadChapterPermanent() {
  await db.imageBytes.clear()
  await db.downloads.clear()
  await downloadChapter(
    { chapterId: 'c1', seriesId: 's1', proxyUrls: ['u0', 'u1', 'u2'] },
    'single',
    fakeFetch(),
  )
  assert.ok(await isDownloaded('c1'), 'chapter marked done')
  const rows = await db.imageBytes.where('chapterId').equals('c1').toArray()
  assert.equal(rows.length, 3, 'all pages stored')
  assert.ok(rows.every((r) => r.tier === 'download'), 'pages are permanent tier')
  const d = await db.downloads.get('c1')
  assert.equal(d?.pagesDone, 3, 'progress complete')
  console.log('✓ downloadChapter stores permanent bytes + progress')
}

async function testNextN() {
  await db.downloads.clear()
  const ordered = ['a', 'b', 'c', 'd', 'e']
  await downloadChapter({ chapterId: 'b', seriesId: 's', proxyUrls: ['u'] }, 'single', fakeFetch())
  // From index 0, next 3 not-yet-downloaded: a, c, d (b already done, skipped).
  const next = await nextNToDownload(ordered, 0, 3)
  assert.deepEqual(next, ['a', 'c', 'd'], 'skips already-downloaded, keeps ordered')
  console.log('✓ nextNToDownload skips downloaded, respects order')
}

async function main() {
  await testDownloadChapterPermanent()
  await testNextN()
  console.log('\nDOWNLOADS SELF-CHECK PASSED ✅')
}
main().catch((e) => {
  console.error('DOWNLOADS SELF-CHECK FAILED ❌', e)
  process.exit(1)
})
