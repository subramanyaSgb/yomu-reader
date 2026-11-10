// Add-series helpers self-check. Run: npx tsx src/features/shelf/addSeries.selfcheck.ts
import assert from 'node:assert/strict'
import { altTitles, chapterNumberOf, genresOf, linkIn, matchManga, matchSharedLink, rankHits, similarity } from './addSeries'
import type { MDManga } from '../../lib/mangadex/queries'

function testLinkDetection() {
  assert.equal(linkIn('Solo Leveling'), null, 'a title is not a link')
  assert.equal(linkIn('Dr. Frost'), null, 'a dotted title is not a link')
  assert.equal(linkIn('https://example.com/manga/foo/'), 'https://example.com/manga/foo/')
  assert.equal(linkIn('Check this out https://example.com/m/foo.'), 'https://example.com/m/foo', 'shared text + trailing dot')
  assert.equal(linkIn('weebcentral.com/series/01ABC/Solo-Leveling'), 'https://weebcentral.com/series/01ABC/Solo-Leveling')
  console.log('✓ link vs title detection')
}

function testSimilarity() {
  assert.equal(similarity("Omniscient Reader's Viewpoint", 'omniscient reader viewpoint'), 1, 'possessive + case ignored')
  assert.ok(similarity('Even if He Keeps Spending, Money Accumulates', 'Money Keeps Piling Up No Matter How Much I Spend') < 0.4, 'renamed series is NOT similar by words')
  assert.equal(similarity('', 'x'), 0)
  console.log('✓ title similarity')
}

function testRanking() {
  const hits = [
    { id: '01A/Life-Is-Money', title: 'Life Is Money', cover: '' },
    { id: 'buddy:x:money-keeps-piling-up', title: 'Money Keeps Piling Up No Matter How Much I Spend', cover: '' },
    { id: '01A/Life-Is-Money', title: 'Life Is Money', cover: '' }, // duplicate from a second search
    { id: 'buddy:y:solo', title: 'Solo Leveling', cover: '' },
    { id: '01B/Solo-Leveling', title: 'Solo Leveling', cover: '' },
  ]
  const ranked = rankHits(hits, ['Even if He Keeps Spending, Money Accumulates', 'Money Keeps Piling Up No Matter How Much I Spend'])
  assert.equal(ranked.length, 4, 'duplicates collapse')
  assert.equal(ranked[0].id, 'buddy:x:money-keeps-piling-up', 'alt-title match ranks first')
  const solo = rankHits(hits, ['Solo Leveling'])
  assert.equal(solo[0].id, '01B/Solo-Leveling', 'WeebCentral wins a tie over Comizy')
  console.log('✓ merge + rank across sources')
}

function md(title: string, alts: string[], genres: string[] = []): MDManga {
  return {
    id: title, type: 'manga',
    attributes: {
      title: { en: title }, altTitles: alts.map(a => ({ en: a })), description: {}, status: 'ongoing', year: null,
      contentRating: 'safe',
      tags: genres.map(g => ({ id: g, attributes: { name: { en: g }, group: 'genre' } })),
    },
    relationships: [],
  }
}

function testAltTitles() {
  const list = [
    md('Unrelated Money Story', []),
    md('Money Keeps Piling Up No Matter How Much I Spend', ['Even if He Keeps Spending, Money Accumulates', '돈이 쌓인다'], ['Drama', 'Fantasy']),
  ]
  const m = matchManga(list, 'Even if He Keeps Spending Money Accumulates')
  assert.equal(m?.id, 'Money Keeps Piling Up No Matter How Much I Spend', 'matched through an alt title')
  assert.deepEqual(altTitles(m, 'Even if He Keeps Spending Money Accumulates'), ['Money Keeps Piling Up No Matter How Much I Spend'], 'returns the OTHER names, Latin only')
  assert.deepEqual(genresOf(m), ['Drama', 'Fantasy'])
  assert.equal(matchManga(list, 'Completely Different Thing'), null, 'no confident match → null')
  console.log('✓ MangaDex alt titles + genres')
}

function testChapterNumber() {
  assert.equal(chapterNumberOf('https://x.com/manga/foo/chapter-12/'), '12')
  assert.equal(chapterNumberOf('https://x.com/manga/foo/chapter-12-5/'), '12.5')
  assert.equal(chapterNumberOf('https://x.com/manga/foo.27428/c113'), '113')
  assert.equal(chapterNumberOf('https://x.com/read/abc', 'Foo - Chapter 7 | Site'), '7', 'page title wins')
  assert.equal(chapterNumberOf('https://x.com/manga/foo/'), null)
  console.log('✓ chapter number from page url/title')
}

function testSharedLink() {
  const entries = [
    { id: '01A/Solo-Leveling' },
    { id: 'web:https://www.site.org/manga/sword-master/' },
    { id: 'web:https://katana.com/manga/holy-maidens.27428' },
  ]
  assert.equal(matchSharedLink('https://site.org/manga/sword-master/chapter-9/', entries)?.id, 'web:https://www.site.org/manga/sword-master/', 'chapter of a known series (www ignored)')
  assert.equal(matchSharedLink('https://katana.com/manga/holy-maidens.27428/c113', entries)?.id, 'web:https://katana.com/manga/holy-maidens.27428', 'numeric id suffix on the slug')
  assert.equal(matchSharedLink('https://site.org/manga/other-series/chapter-1/', entries), null, 'same site, different series')
  assert.equal(matchSharedLink('https://elsewhere.com/manga/sword-master/', entries), null, 'different site')
  console.log('✓ shared link → series')
}

testLinkDetection()
testSharedLink()
testSimilarity()
testRanking()
testAltTitles()
testChapterNumber()
console.log('addSeries self-check passed')
