// Generic "any site" extraction for web: series (Phase 19).
// Pure string → data functions (no Workers APIs) so they run under tsx for the
// self-check. They are heuristics over server-rendered HTML, not per-site scrapers:
// when they find nothing the caller falls back to the proxied site view.

export interface GenericChapter {
  url: string
  number: string | null
  title: string | null
}

export interface GenericSeries {
  title: string
  cover: string
  chapters: GenericChapter[] // ascending
}

export function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
}

function textOf(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  if (!m) return null
  return decodeHtml(m[1] ?? m[2] ?? m[3] ?? '').trim()
}

function absolute(href: string, base: string): URL | null {
  try {
    const u = new URL(href, base)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u : null
  } catch {
    return null
  }
}

const bareHost = (h: string) => h.toLowerCase().replace(/^www\./, '')

/** A Cloudflare/anti-bot interstitial or a hard refusal — the worker can't read this site. */
export function looksBlocked(status: number, html: string): boolean {
  if (status === 403 || status === 429 || status === 503) return true
  return /_cf_chl_opt|cf-browser-verification|<title>\s*Just a moment|Attention Required! \| Cloudflare|challenge-platform/i.test(html.slice(0, 20_000))
}

const CH_TEXT = /\b(?:chapter|chap|ch|episode|ep)\b\.?\s*[-#:]?\s*(\d+(?:\.\d+)?)/i
const CH_HREF = /(?:chapter|chap|episode|ch|ep)[-_/]?(\d+)(?:[-_.](\d{1,2})(?![\d]))?/i

export function chapterNumberFrom(text: string, href = ''): string | null {
  const t = text.match(CH_TEXT)
  if (t) return t[1]
  const h = href.match(CH_HREF)
  if (h) return h[2] ? `${h[1]}.${h[2]}` : h[1]
  return null
}

function metaContent(html: string, key: string): string {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0]
    const k = attr(tag, 'property') ?? attr(tag, 'name')
    if (k?.toLowerCase() === key) return attr(tag, 'content') ?? ''
  }
  return ''
}

function seriesTitle(html: string): string {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
  const fromH1 = h1 ? textOf(h1[1]) : ''
  if (fromH1 && fromH1.length <= 140) return fromH1
  const raw = metaContent(html, 'og:title') || textOf(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
  // "Read Solo Leveling Manga - SiteName" → "Solo Leveling"
  return raw
    .split(/\s+[|–—-]\s+/)[0]
    .replace(/^read\s+/i, '')
    .replace(/\s+(manga|manhwa|manhua|webtoon|comic)s?(\s+online)?(\s+(for\s+)?free)?$/i, '')
    .trim()
}

/** Chapter list + title + cover from a series page. */
export function extractSeries(html: string, pageUrl: string): GenericSeries {
  const page = absolute(pageUrl, pageUrl)
  if (!page) return { title: '', cover: '', chapters: [] }
  const body = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ')

  interface Cand { url: URL; number: string | null; title: string | null }
  const seen = new Map<string, Cand>()
  for (const m of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attr(m[1], 'href')
    if (!href || href.startsWith('#') || /^javascript:/i.test(href)) continue
    const url = absolute(href, pageUrl)
    if (!url || bareHost(url.host) !== bareHost(page.host)) continue
    url.hash = ''
    if (url.pathname.replace(/\/+$/, '') === page.pathname.replace(/\/+$/, '')) continue
    const text = textOf(m[2])
    const pathAndQuery = url.pathname + url.search
    if (!CH_TEXT.test(text) && !CH_HREF.test(pathAndQuery)) continue
    const key = url.toString()
    const prev = seen.get(key)
    // Same link often appears twice (thumbnail + label) — keep the labelled one.
    if (prev && (prev.title || !text)) continue
    seen.set(key, { url, number: chapterNumberFrom(text, pathAndQuery), title: text || null })
  }
  let cands = [...seen.values()]

  // Drop "latest updates" links for OTHER series: keep links carrying this series'
  // slug, else the largest group sharing a parent path.
  const slug = page.pathname.split('/').filter(Boolean).pop()?.toLowerCase().replace(/\.html?$/, '') ?? ''
  const withSlug = slug.length >= 3 ? cands.filter(c => c.url.pathname.toLowerCase().includes(slug)) : []
  if (withSlug.length >= 1 && withSlug.length >= cands.length * 0.2) {
    cands = withSlug
  } else if (cands.length) {
    // Two groupings, biggest group wins: same parent folder (/chapters/{id}) or same
    // path shape with numbers blanked (/chapters/#-#/naruto-chapter-#).
    const groups = new Map<string, Cand[]>()
    const add = (k: string, c: Cand) => groups.set(k, [...(groups.get(k) ?? []), c])
    for (const c of cands) {
      const path = c.url.pathname.replace(/\/+$/, '')
      add('dir:' + path.split('/').slice(0, -1).join('/'), c)
      add('shape:' + path.replace(/\d+(?:\.\d+)?/g, '#'), c)
    }
    cands = [...groups.values()].sort((a, b) => b.length - a.length)[0]
  }

  const numbered = cands.filter(c => c.number != null)
  let ordered: Cand[]
  if (numbered.length >= cands.length * 0.8 && numbered.length > 0) {
    const byNum = new Map<string, Cand>()
    for (const c of numbered) {
      const k = String(parseFloat(c.number!))
      if (!byNum.has(k)) byNum.set(k, c)
    }
    ordered = [...byNum.values()].sort((a, b) => parseFloat(a.number!) - parseFloat(b.number!))
  } else {
    ordered = [...cands].reverse() // lists are almost always newest-first
  }

  const cover = metaContent(html, 'og:image') || metaContent(html, 'twitter:image')
  return {
    title: seriesTitle(html),
    cover: cover ? (absolute(cover, pageUrl)?.toString() ?? '') : '',
    chapters: ordered.map(c => ({ url: c.url.toString(), number: c.number, title: c.title })),
  }
}

const LAZY_ATTRS = ['data-src', 'data-lazy-src', 'data-original', 'data-url', 'data-cfsrc', 'data-lazy', 'src']
const JUNK_PATH = /(logo|avatar|favicon|[-_/]icons?[-_/.]|banner|sprite|gravatar|emoji|placeholder|loading|spinner|[-_/]ads?[-_/.]|badge|button)/i
const COVERISH = /(cover|thumb|poster|related|popular)/i

/** The real image URL of an <img> (lazy-load attribute before src), absolute.
 *  `get` reads an attribute — from a tag string here, from HTMLRewriter in the worker. */
export function imgSource(get: (name: string) => string | null, pageUrl: string): string | null {
  for (const name of LAZY_ATTRS) {
    const v = get(name)
    if (!v || v.startsWith('data:')) continue
    const u = absolute(v.replace(/\s+/g, ''), pageUrl)
    if (u) return u.toString()
  }
  return null
}

/** "the-lazy-lord.1234" → "The Lazy Lord" — a title of last resort for blocked sites. */
export function titleFromUrl(pageUrl: string): string {
  let seg = ''
  try { seg = new URL(pageUrl).pathname.split('/').filter(Boolean).pop() ?? '' } catch { /* keep '' */ }
  try { seg = decodeURIComponent(seg) } catch { /* keep raw */ }
  return seg
    .replace(/\.html?$/i, '').replace(/[.-]\d+$/, '').replace(/[-_+]+/g, ' ').trim()
    .replace(/\b\p{L}/gu, c => c.toUpperCase())
}

function pickPageGroup(urls: string[], pageUrl: string): string[] {
  const page = pageUrl.split('#')[0]
  const usable: Array<{ s: string; u: URL }> = []
  for (const s of urls) {
    let u: URL
    try { u = new URL(s) } catch { continue }
    if (s.split('#')[0] === page) continue // src="#" placeholders
    if (/\.(svg|gif|ico)$/i.test(u.pathname) || JUNK_PATH.test(u.pathname)) continue
    usable.push({ s, u })
  }
  const segs = (u: URL) => u.pathname.split('/').filter(Boolean)
  // Strict: same folder. Loose: same host + depth + top folder — for CDNs that put
  // every page under its own token folder (/token/{t}/3.jpg).
  const keyFns: Array<(u: URL) => string> = [
    u => u.host + '/' + segs(u).slice(0, -1).join('/'),
    u => `${u.host}/${segs(u)[0] ?? ''}#${segs(u).length}`,
  ]
  for (const keyOf of keyFns) {
    const groups = new Map<string, string[]>()
    for (const { s, u } of usable) {
      const key = keyOf(u)
      const list = groups.get(key) ?? []
      if (!list.includes(s)) list.push(s)
      groups.set(key, list)
    }
    let best: string[] = []
    let bestScore = 0
    for (const [key, list] of groups) {
      // Page images are named in sequence (001.jpg, 12.webp, page_3.png); related-series
      // thumbnails are not, and sit under cover/thumb paths.
      const sequential = list.filter(s => /(^|[-_])\d{1,4}\.[a-z]+($|\?)/i.test(s.split('/').pop() ?? '')).length
      let score = list.length * (sequential >= list.length * 0.6 ? 3 : 1)
      if (COVERISH.test(key)) score *= 0.2
      if (score > bestScore) { best = list; bestScore = score }
    }
    if (best.length >= 3) return best
  }
  return []
}

/** Page images of a chapter page, in reading order. Empty unless at least 3 images
 *  clearly belong together (anything less is more likely site furniture). */
export function extractPages(html: string, pageUrl: string): string[] {
  const noComments = html.replace(/<!--[\s\S]*?-->/g, ' ')
  const fromTags: string[] = []
  for (const m of noComments.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').matchAll(/<img\b[^>]*>/gi)) {
    const src = imgSource(name => attr(m[0], name), pageUrl)
    if (src) fromTags.push(src)
  }
  const tagGroup = pickPageGroup(fromTags, pageUrl)
  if (tagGroup.length) return tagGroup

  // Script-rendered readers keep the list in inline JSON / JS arrays.
  const flat = noComments.replace(/\\u002[fF]/g, '/').replace(/\\\//g, '/')
  const fromText = [...flat.matchAll(/https?:\/\/[^"'\s\\<>()]+?\.(?:jpe?g|png|webp|avif)(?:\?[^"'\s\\<>()]*)?/gi)].map(m => decodeHtml(m[0]))
  return pickPageGroup(fromText, pageUrl)
}
