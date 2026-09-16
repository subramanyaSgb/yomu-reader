// Phase 3 logic self-check. Run: npx tsx src/features/library/library.selfcheck.ts
import assert from 'node:assert/strict'
import { naturalSort, naturalCompare } from '../../lib/naturalSort'
import {
  unreadCount,
  sortComparator,
  onShelf,
  addToCollection,
  removeFromCollection,
  type LibraryEntry,
} from './libraryLogic'
import { normalizeTitle, jaccard, findDuplicates } from './duplicateDetection'

function testNaturalSort() {
  const files = ['page10.jpg', 'page2.jpg', 'page1.jpg', 'page20.jpg', 'cover.jpg']
  const sorted = naturalSort(files)
  assert.deepEqual(
    sorted,
    ['cover.jpg', 'page1.jpg', 'page2.jpg', 'page10.jpg', 'page20.jpg'],
    'natural order: 2 before 10',
  )
  assert.ok(naturalCompare('ch1p9', 'ch1p10') < 0, 'p9 < p10')
  console.log('✓ natural sort (page2 before page10)')
}

const entry = (o: Partial<LibraryEntry>): LibraryEntry => ({
  seriesId: 's',
  title: 'T',
  shelf: 'reading',
  collections: [],
  lastReadAt: 0,
  lastUpdatedAt: 0,
  totalChapters: 0,
  readChapters: 0,
  ...o,
})

function testLibrary() {
  assert.equal(unreadCount(entry({ totalChapters: 10, readChapters: 3 })), 7, 'unread = 7')
  assert.equal(unreadCount(entry({ totalChapters: 3, readChapters: 5 })), 0, 'no negative unread')

  const entries = [
    entry({ seriesId: 'a', title: 'Zebra', lastReadAt: 100, lastUpdatedAt: 5 }),
    entry({ seriesId: 'b', title: 'Apple', lastReadAt: 50, lastUpdatedAt: 99 }),
  ]
  assert.equal(entries.slice().sort(sortComparator('az'))[0].title, 'Apple', 'az sort')
  assert.equal(entries.slice().sort(sortComparator('recent'))[0].seriesId, 'a', 'recent sort')
  assert.equal(entries.slice().sort(sortComparator('updated'))[0].seriesId, 'b', 'updated sort')

  assert.equal(onShelf(entries, 'reading').length, 2, 'shelf filter')

  let e = entry({})
  e = addToCollection(e, 'Favs')
  e = addToCollection(e, 'Favs') // idempotent
  assert.deepEqual(e.collections, ['Favs'], 'collection add idempotent')
  e = removeFromCollection(e, 'Favs')
  assert.deepEqual(e.collections, [], 'collection remove')
  console.log('✓ library shelves/collections/sort/unread')
}

function testDuplicates() {
  assert.equal(normalizeTitle('The Solo Leveling (Colored) Manhwa'), 'solo leveling', 'normalize strips noise')
  assert.ok(jaccard(new Set(['solo', 'leveling']), new Set(['solo', 'leveling'])) === 1, 'identical jaccard=1')

  const groups = findDuplicates([
    { seriesId: '1', title: 'Solo Leveling' },
    { seriesId: '2', title: 'Solo Leveling (Official Colored)' },
    { seriesId: '3', title: 'Omniscient Reader' },
  ])
  assert.equal(groups.length, 1, 'one duplicate cluster')
  assert.equal(groups[0].length, 2, 'the two Solo Levelings cluster')
  assert.ok(!groups[0].some((s) => s.seriesId === '3'), 'unrelated title not clustered')
  console.log('✓ duplicate detection clusters near-titles')
}

testNaturalSort()
testLibrary()
testDuplicates()
console.log('\nLIBRARY/PHASE-3 SELF-CHECK PASSED ✅')
