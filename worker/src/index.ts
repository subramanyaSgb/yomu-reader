// Yomu proxy — Cloudflare Worker.
// Routes:
//   GET /img?u=<encoded @Home URL>&q=<source|low>   — MangaDex image proxy
//   GET /api/<path>?<qs>                             — MangaDex API proxy (CORS-locked from browser)
//   GET /scrape?site=kakalot&action=<...>&<params>   — Mangakakalot HTML scraper
//
// SECURITY: restricted proxy — each route only allows its specific upstream host(s).

const ALLOWED_IMAGE_HOST = /(^|\.)mangadex\.network$/
const ALLOWED_UPLOADS = 'uploads.mangadex.org'
const MANGADEX_API = 'https://api.mangadex.org'

// Mangakakalot network domains
const KAKALOT_MAIN = 'https://mangakakalot.gg'
const KAKALOT_NATO = 'https://chapmanganato.to'
const KAKALOT_IMG_HOST = /\.mkklcdnv6temp(v\d+)?\.com$/

function isAllowedImage(host: string): boolean {
  return ALLOWED_IMAGE_HOST.test(host) || host === ALLOWED_UPLOADS
}

function corsHeaders(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

function json(data: unknown, origin: string | null, status = 200): Response {
  const h = new Headers(corsHeaders(origin))
  h.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(data), { status, headers: h })
}

// --- Mangakakalot HTML scraper helpers ---
// Uses HTMLRewriter (Cloudflare's streaming HTML parser) — no cheerio needed.

interface KakalotManga {
  id: string        // URL slug, e.g. "manga-aa951409" or "read-onepiece"
  title: string
  cover: string
  source: 'kakalot'
}

interface KakalotChapter {
  id: string        // full URL of chapter page (serves as stable ID)
  number: string | null
  title: string | null
  publishAt: string
}

interface KakalotPage {
  src: string       // image CDN URL
}

// Determine which base URL to use for a manga ID.
// IDs starting with "manga-" live on chapmanganato.to; others on mangakakalot.gg
function kakalotSeriesUrl(id: string): string {
  return id.startsWith('manga-')
    ? `${KAKALOT_NATO}/${id}`
    : `${KAKALOT_MAIN}/read-${id}`
}

// Chapter URLs from the series page are absolute — use as-is.
// The ID we store IS the chapter URL.
function kakalotChapterUrl(id: string): string {
  return id
}

// Extract domain-appropriate Referer for image CDN requests.
function kakalotReferer(chapterUrl: string): string {
  try {
    const u = new URL(chapterUrl)
    return u.origin + '/'
  } catch {
    return `${KAKALOT_NATO}/`
  }
}

// Scrape search results page.
async function scrapeSearch(query: string): Promise<KakalotManga[]> {
  const slug = encodeURIComponent(query.trim().replace(/\s+/g, '_'))
  const url = `${KAKALOT_MAIN}/search/story/${slug}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; YomuReader/1.0)',
      Referer: KAKALOT_MAIN + '/',
    },
  })
  if (!res.ok) return []

  const results: KakalotManga[] = []
  let current: Partial<KakalotManga> = {}

  await new HTMLRewriter()
    .on('.story_item', {
      element() {
        if (current.id && current.title) results.push(current as KakalotManga)
        current = { source: 'kakalot' }
      },
    })
    .on('.story_item .story_item_right h3.story_name a', {
      element(el) {
        const href = el.getAttribute('href') ?? ''
        // Extract slug: last path segment
        current.id = href.split('/').filter(Boolean).pop() ?? href
        current.title = ''
      },
      text(chunk) {
        if (chunk.text) current.title = (current.title ?? '') + chunk.text
      },
    })
    .on('.story_item img', {
      element(el) {
        current.cover = el.getAttribute('src') ?? ''
      },
    })
    .transform(res)
    .text() // consume stream

  if (current.id && current.title) results.push(current as KakalotManga)
  return results.slice(0, 24)
}

// Scrape chapter list from series page.
async function scrapeChapters(mangaId: string): Promise<{ title: string; chapters: KakalotChapter[]; cover: string }> {
  const url = kakalotSeriesUrl(mangaId)
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; YomuReader/1.0)',
      Referer: KAKALOT_MAIN + '/',
    },
  })
  if (!res.ok) return { title: '', chapters: [], cover: '' }

  const chapters: KakalotChapter[] = []
  let seriesTitle = ''
  let cover = ''
  let currentChapter: Partial<KakalotChapter> = {}
  let inChapterList = false

  await new HTMLRewriter()
    .on('.manga-info-text h1', {
      text(chunk) { seriesTitle += chunk.text },
    })
    .on('.manga-info-pic img', {
      element(el) { cover = el.getAttribute('src') ?? '' },
    })
    .on('.chapter-list', {
      element() { inChapterList = true },
    })
    .on('.chapter-list .row span a', {
      element(el) {
        if (!inChapterList) return
        if (currentChapter.id) {
          chapters.push(currentChapter as KakalotChapter)
        }
        const href = el.getAttribute('href') ?? ''
        const title = el.getAttribute('title') ?? null
        // Extract chapter number from URL: chapter_123 or chapter-123
        const numMatch = href.match(/chapter[_-]([\d.]+)/i)
        currentChapter = {
          id: href,
          number: numMatch ? numMatch[1] : null,
          title,
          publishAt: '',
        }
      },
    })
    .on('.chapter-list .row span.chapter-time', {
      text(chunk) {
        if (chunk.text.trim()) currentChapter.publishAt = (currentChapter.publishAt ?? '') + chunk.text
      },
    })
    .transform(res)
    .text()

  if (currentChapter.id) chapters.push(currentChapter as KakalotChapter)
  // Chapters come newest-first from the page; reverse to ascending for the reader.
  return { title: seriesTitle.trim(), chapters: chapters.reverse(), cover }
}

// Scrape chapter page images.
async function scrapePages(chapterUrl: string): Promise<KakalotPage[]> {
  const res = await fetch(chapterUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; YomuReader/1.0)',
      Referer: kakalotReferer(chapterUrl),
    },
  })
  if (!res.ok) return []

  const pages: KakalotPage[] = []

  await new HTMLRewriter()
    .on('.container-chapter-reader img', {
      element(el) {
        const src = el.getAttribute('src') ?? ''
        if (src) pages.push({ src })
      },
    })
    .transform(res)
    .text()

  return pages
}

// Proxy a Mangakakalot CDN image (needs server-side Referer spoofing).
async function proxyKakalotImage(imageUrl: string, referer: string, origin: string | null): Promise<Response> {
  let parsed: URL
  try { parsed = new URL(imageUrl) } catch {
    return new Response('Bad image URL', { status: 400, headers: corsHeaders(origin) })
  }
  if (!KAKALOT_IMG_HOST.test(parsed.host)) {
    return new Response('Forbidden host', { status: 403, headers: corsHeaders(origin) })
  }

  const upstream = await fetch(imageUrl, {
    headers: {
      Referer: referer,
      'User-Agent': 'Mozilla/5.0 (compatible; YomuReader/1.0)',
    },
    cf: { cacheEverything: true, cacheTtl: 86_400 },
  })
  if (!upstream.ok) {
    return new Response('Upstream error', { status: upstream.status, headers: corsHeaders(origin) })
  }
  const headers = new Headers(corsHeaders(origin))
  headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'image/jpeg')
  headers.set('Cache-Control', 'public, max-age=86400, immutable')
  return new Response(upstream.body, { status: 200, headers })
}

// --- Main handler ---

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin')

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    const url = new URL(request.url)

    // /api — MangaDex API proxy
    if (url.pathname.startsWith('/api/')) {
      const mdPath = url.pathname.slice(4)
      const mdUrl = new URL(MANGADEX_API + mdPath)
      url.searchParams.forEach((v, k) => mdUrl.searchParams.append(k, v))

      const upstream = await fetch(mdUrl.toString(), {
        headers: { 'User-Agent': 'YomuReader/1.0 (personal manga PWA)' },
        cf: { cacheTtl: 60, cacheEverything: true },
      })
      const headers = new Headers(corsHeaders(origin))
      headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'application/json')
      if (upstream.ok) headers.set('Cache-Control', 'public, max-age=60, s-maxage=60')
      return new Response(upstream.body, { status: upstream.status, headers })
    }

    // /scrape — Mangakakalot scraper
    if (url.pathname === '/scrape') {
      const site = url.searchParams.get('site')
      const action = url.searchParams.get('action')
      if (site !== 'kakalot') {
        return json({ error: 'unknown site' }, origin, 400)
      }

      try {
        if (action === 'search') {
          const q = url.searchParams.get('q') ?? ''
          if (!q) return json({ results: [] }, origin)
          const results = await scrapeSearch(q)
          return json({ results }, origin)
        }

        if (action === 'chapters') {
          const id = url.searchParams.get('id') ?? ''
          if (!id) return json({ error: 'missing id' }, origin, 400)
          const data = await scrapeChapters(id)
          return json(data, origin)
        }

        if (action === 'pages') {
          const id = url.searchParams.get('id') ?? ''
          if (!id) return json({ error: 'missing id' }, origin, 400)
          // id IS the full chapter URL
          const pages = await scrapePages(id)
          return json({ pages }, origin)
        }

        if (action === 'img') {
          const imageUrl = url.searchParams.get('u') ?? ''
          const referer = url.searchParams.get('ref') ?? `${KAKALOT_NATO}/`
          return proxyKakalotImage(imageUrl, referer, origin)
        }

        return json({ error: 'unknown action' }, origin, 400)
      } catch (e) {
        return json({ error: String(e) }, origin, 500)
      }
    }

    // /img — MangaDex image proxy
    if (url.pathname === '/img') {
      const target = url.searchParams.get('u')
      if (!target) return new Response('Missing u', { status: 400, headers: corsHeaders(origin) })

      let parsed: URL
      try { parsed = new URL(target) } catch {
        return new Response('Bad u', { status: 400, headers: corsHeaders(origin) })
      }
      if (parsed.protocol !== 'https:' || !isAllowedImage(parsed.host)) {
        return new Response('Forbidden host', { status: 403, headers: corsHeaders(origin) })
      }

      const upstream = await fetch(parsed.toString(), {
        headers: {
          'Accept': 'image/webp,image/jpeg,image/*,*/*',
          'Referer': 'https://mangadex.org/',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        },
        cf: { cacheEverything: true, cacheTtl: 86_400 },
      })
      if (!upstream.ok) {
        return new Response(`Upstream error ${upstream.status}`, { status: upstream.status, headers: corsHeaders(origin) })
      }
      const headers = new Headers(corsHeaders(origin))
      headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'image/jpeg')
      headers.set('Cache-Control', 'public, max-age=86400, immutable')
      return new Response(upstream.body, { status: 200, headers })
    }

    return new Response('Not found', { status: 404, headers: corsHeaders(origin) })
  },
}
