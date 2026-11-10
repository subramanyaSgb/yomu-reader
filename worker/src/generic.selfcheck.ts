// Any-site extraction self-check. Run: npx tsx worker/src/generic.selfcheck.ts
// Fixtures are trimmed copies of the page shapes met on real sites (Phase 19).
import assert from 'node:assert/strict'
import { chapterNumberFrom, extractPages, extractSeries, imgSource, looksBlocked, titleFromUrl } from './generic'

function testSeriesWithSlugLinks() {
  // WordPress "Madara" shape: newest-first list + a sidebar of OTHER series' chapters.
  const html = `<html><head><meta property="og:image" content="/covers/sword.jpg"><title>x</title></head><body>
    <h1> Reincarnation of the <b>Sword Master</b> </h1>
    <ul>
      <li><a href="https://site.org/manga/sword-master/chapter-3/">Chapter 3</a></li>
      <li><a href="https://site.org/manga/sword-master/chapter-2-5/">Chapter 2.5</a></li>
      <li><a href="/manga/sword-master/chapter-2/"><img src="t.jpg"></a><a href="/manga/sword-master/chapter-2/">Chapter 2</a></li>
      <li><a href="/manga/sword-master/chapter-1/">Chapter 1</a></li>
    </ul>
    <aside><a href="/manga/other-series/chapter-99/">Chapter 99</a><a href="/manga/another/chapter-7/">Chapter 7</a></aside>
    <script>var x = '<a href="/manga/sword-master/chapter-500/">Chapter 500</a>'</script>
  </body></html>`
  const s = extractSeries(html, 'https://site.org/manga/sword-master/')
  assert.equal(s.title, 'Reincarnation of the Sword Master', 'h1 text, tags stripped')
  assert.equal(s.cover, 'https://site.org/covers/sword.jpg', 'og:image made absolute')
  assert.deepEqual(s.chapters.map(c => c.number), ['1', '2', '2.5', '3'], 'ascending, other series + script text ignored')
  assert.equal(s.chapters[1].url, 'https://site.org/manga/sword-master/chapter-2/', 'duplicate link collapsed')
  assert.equal(s.chapters[1].title, 'Chapter 2', 'the labelled copy of a duplicate link wins')
  console.log('✓ series: slug-filtered chapter list')
}

function testSeriesWithoutSlug() {
  // Chapter URLs carry no series slug (/chapters/{id}-{n}/other-name-chapter-n).
  const rows = [3, 2, 1].map(n => `<a href="/chapters/3069-1000${n}000/naruto-chapter-${n}">Chapter ${n}</a>`).join('')
  const html = `<title>Read Naruto Manga - Site</title>${rows}<a href="/chapters/77-1/bleach-chapter-1">Chapter 1</a>`
  const s = extractSeries(html, 'https://pill.com/manga/3069/some-old-slug')
  assert.equal(s.title, 'Naruto', '<title> cleaned of "Read … Manga - Site"')
  assert.equal(s.chapters.length, 3, 'largest same-shape group wins over the stray link')
  assert.equal(s.chapters[0].number, '1')
  console.log('✓ series: path-shape grouping')
}

function testNoChapters() {
  const s = extractSeries('<h1>About us</h1><a href="/contact">Contact</a>', 'https://site.org/about')
  assert.equal(s.chapters.length, 0)
  console.log('✓ series: page without chapters → empty')
}

function testPagesFromLazyImages() {
  const imgs = [1, 2, 3, 4].map(n => `<img class="lazy" src="data:image/gif;base64,AAAA" data-src="\n  https://cdn.site.org/m/55/${n}.jpeg ">`).join('')
  const html = `<img src="/static/logo.png"><img src="#">${imgs}
    <img src="https://cdn.site.org/covers/a.jpg"><img src="https://cdn.site.org/covers/b.jpg"><img src="https://cdn.site.org/covers/c.jpg">
    <img src="https://cdn.site.org/covers/d.jpg"><img src="https://cdn.site.org/covers/e.jpg">`
  const p = extractPages(html, 'https://site.org/manga/x/chapter-1/')
  assert.deepEqual(p, [1, 2, 3, 4].map(n => `https://cdn.site.org/m/55/${n}.jpeg`), 'lazy attr used, whitespace trimmed, covers/logo dropped')
  console.log('✓ pages: lazy-loaded <img> tags')
}

function testPagesFromScriptArray() {
  // Script-rendered reader, every page under its own token folder.
  const html = `<img src="#"><script>var pages=['https:\\/\\/i1.site.com\\/token\\/aaa\\/0.jpg','https:\\/\\/i1.site.com\\/token\\/bbb\\/1.jpg','https:\\/\\/i1.site.com\\/token\\/ccc\\/2.jpg'];</script>`
  const p = extractPages(html, 'https://site.com/manga/x/c1')
  assert.deepEqual(p, ['https://i1.site.com/token/aaa/0.jpg', 'https://i1.site.com/token/bbb/1.jpg', 'https://i1.site.com/token/ccc/2.jpg'])
  console.log('✓ pages: inline JS array + per-page token folders')
}

function testPagesNeedThree() {
  assert.deepEqual(extractPages('<img src="https://x.org/a/1.jpg"><img src="https://x.org/a/2.jpg">', 'https://x.org/p'), [], 'two images are not a chapter')
  console.log('✓ pages: fewer than 3 → nothing (falls back to site view)')
}

function testHelpers() {
  assert.equal(looksBlocked(403, ''), true)
  assert.equal(looksBlocked(200, '<title>Just a moment...</title>'), true)
  assert.equal(looksBlocked(200, '<h1>Solo Leveling</h1>'), false)
  assert.equal(chapterNumberFrom('Chapter 12.5 - The Return'), '12.5')
  assert.equal(chapterNumberFrom('', '/comics/x/chapter/126'), '126')
  assert.equal(chapterNumberFrom('Read now', '/about'), null)
  assert.equal(titleFromUrl('https://x.com/serie/the-lazy-lord-005/'), 'The Lazy Lord')
  assert.equal(titleFromUrl('https://x.com/manga/holy-maidens.27428'), 'Holy Maidens')
  assert.equal(imgSource(n => (n === 'src' ? '/a/b.png' : null), 'https://x.com/c/'), 'https://x.com/a/b.png')
  assert.equal(imgSource(n => (n === 'src' ? 'data:image/png;base64,AA' : null), 'https://x.com/'), null)
  console.log('✓ helpers')
}

testSeriesWithSlugLinks()
testSeriesWithoutSlug()
testNoChapters()
testPagesFromLazyImages()
testPagesFromScriptArray()
testPagesNeedThree()
testHelpers()
console.log('generic self-check passed')
