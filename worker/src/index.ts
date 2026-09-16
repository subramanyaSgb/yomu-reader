// Yomu proxy — Cloudflare Worker.
// Routes:
//   GET /img?u=<encoded @Home URL>&q=<source|low>   — MangaDex image proxy
//   GET /api/<path>?<qs>                             — MangaDex API proxy (CORS-locked from browser)
//   GET /comick/<path>?<qs>                          — Comick API proxy
//   GET /scrape?site=kakalot&action=<...>&<params>   — fallback-source scraper (Mangapill upstream)
//
// NOTE: the wire key stays `site=kakalot` / source:'kakalot' for backward compat with the
// deployed frontend and stored library data, but the upstream is now Mangapill —
// the Mangakakalot network put Cloudflare managed challenges on all manga/chapter pages
// (2026-09), which blocks Worker fetches. Mangapill serves plain HTML with no challenge.
//
// SECURITY: restricted proxy — each route only allows its specific upstream host(s).

const ALLOWED_IMAGE_HOST = /(^|\.)mangadex\.network$/
const ALLOWED_UPLOADS = 'uploads.mangadex.org'
const MANGADEX_API = 'https://api.mangadex.org'
const COMICK_API = 'https://api.comick.dev'

// Mangapill (fallback reading source)
const PILL = 'https://mangapill.com'
const PILL_IMG_HOST = /(^|\.)readdetectiveconan\.com$/
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

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

// --- Mangapill scraper helpers (regex over plain server-rendered HTML) ---

interface KakalotManga {
  id: string        // Mangapill path after /manga/, e.g. "3069/naruto"
  title: string
  cover: string     // pre-proxied through this worker's img action
  source: 'kakalot'
}

interface KakalotChapter {
  id: string        // full URL of chapter page (stable ID)
  number: string | null
  title: string | null
  publishAt: string
}

interface KakalotPage {
  src: string       // raw image CDN URL (frontend wraps it in the img action)
}

async function pillFetch(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      Referer: PILL + '/',
    },
  })
  if (!res.ok) return null
  return res.text()
}

// Build a URL that serves an upstream image through this worker (Referer spoof).
function proxiedImageUrl(workerOrigin: string, src: string): string {
  return `${workerOrigin}/scrape?site=kakalot&action=img&u=${encodeURIComponent(src)}&ref=${encodeURIComponent(PILL + '/')}`
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'")
    .trim()
}

async function scrapeSearch(query: string, workerOrigin: string): Promise<KakalotManga[]> {
  const html = await pillFetch(`${PILL}/search?q=${encodeURIComponent(query.trim())}`)
  if (!html) return []

  // Card shape: <a href="/manga/ID/SLUG" class="relative block">…<img data-src="COVER"…
  //             <a href="/manga/ID/SLUG" class="mb-2"><div …>TITLE</div>
  const covers = new Map<string, string>()
  for (const m of html.matchAll(/<a href="(\/manga\/[^"]+)" class="relative block">[\s\S]{0,600}?data-src="([^"]+)"/g)) {
    covers.set(m[1], m[2])
  }
  const results: KakalotManga[] = []
  for (const m of html.matchAll(/<a href="(\/manga\/[^"]+)" class="mb-2">\s*<div[^>]*>([^<]+)<\/div>/g)) {
    const href = m[1]
    const cover = covers.get(href) ?? ''
    results.push({
      id: href.replace(/^\/manga\//, ''),
      title: decodeEntities(m[2]),
      cover: cover ? proxiedImageUrl(workerOrigin, cover) : '',
      source: 'kakalot',
    })
    if (results.length >= 24) break
  }
  return results
}

async function scrapeChapters(
  mangaId: string,
  workerOrigin: string,
): Promise<{ title: string; chapters: KakalotChapter[]; cover: string }> {
  const html = await pillFetch(`${PILL}/manga/${mangaId}`)
  if (!html) return { title: '', chapters: [], cover: '' }

  const title = decodeEntities(html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] ?? '')
  const rawCover = html.match(/property="og:image" content="([^"]+)"/)?.[1] ?? ''

  const chapters: KakalotChapter[] = []
  for (const m of html.matchAll(/<a [^>]*href="(\/chapters\/[^"]+)"[^>]*>([^<]*)</g)) {
    const href = m[1]
    const numMatch = href.match(/chapter-([\d.]+)\/?$/)
    chapters.push({
      id: PILL + href,
      number: numMatch ? numMatch[1] : null,
      title: decodeEntities(m[2]) || null,
      publishAt: '',
    })
  }
  // Page lists newest-first; reverse to ascending for the reader.
  return {
    title,
    chapters: chapters.reverse(),
    cover: rawCover ? proxiedImageUrl(workerOrigin, rawCover) : '',
  }
}

async function scrapePages(chapterUrl: string): Promise<KakalotPage[]> {
  let parsed: URL
  try { parsed = new URL(chapterUrl) } catch { return [] }
  if (parsed.host !== 'mangapill.com' && parsed.host !== 'www.mangapill.com') return []

  const html = await pillFetch(parsed.toString())
  if (!html) return []

  const pages: KakalotPage[] = []
  for (const m of html.matchAll(/data-src="(https:\/\/[^"]+\/file\/mangap\/[^"]+)"/g)) {
    pages.push({ src: m[1] })
  }
  return pages
}

// Proxy an upstream image that requires a Referer spoof.
async function proxyKakalotImage(imageUrl: string, referer: string, origin: string | null): Promise<Response> {
  let parsed: URL
  try { parsed = new URL(imageUrl) } catch {
    return new Response('Bad image URL', { status: 400, headers: corsHeaders(origin) })
  }
  if (!PILL_IMG_HOST.test(parsed.host)) {
    return new Response('Forbidden host', { status: 403, headers: corsHeaders(origin) })
  }

  const upstream = await fetch(imageUrl, {
    headers: {
      Referer: referer,
      'User-Agent': BROWSER_UA,
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

    // /comick — Comick.dev JSON API proxy (metadata/discovery; browser is CORS-locked from it)
    if (url.pathname.startsWith('/comick/')) {
      const ckPath = url.pathname.slice('/comick'.length) // keeps leading slash
      const ckUrl = new URL(COMICK_API + ckPath)
      url.searchParams.forEach((v, k) => ckUrl.searchParams.append(k, v))

      const upstream = await fetch(ckUrl.toString(), {
        headers: {
          'User-Agent': 'YomuReader/1.0 (personal manga PWA)',
          Accept: 'application/json',
        },
        cf: { cacheTtl: 300, cacheEverything: true },
      })
      const headers = new Headers(corsHeaders(origin))
      headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'application/json')
      if (upstream.ok) headers.set('Cache-Control', 'public, max-age=300, s-maxage=300')
      return new Response(upstream.body, { status: upstream.status, headers })
    }

    // /scrape — fallback-source scraper (Mangapill upstream, legacy `kakalot` wire key)
    if (url.pathname === '/scrape') {
      const site = url.searchParams.get('site')
      const action = url.searchParams.get('action')
      if (site !== 'kakalot') {
        return json({ error: 'unknown site' }, origin, 400)
      }

      try {
        // Diagnostic: fetch an allowed upstream URL and report what the Worker sees.
        if (action === 'probe') {
          const target = url.searchParams.get('u') ?? ''
          let p: URL
          try { p = new URL(target) } catch { return json({ error: 'bad url' }, origin, 400) }
          if (!/(^|\.)(mangapill\.com|readdetectiveconan\.com|mangakakalot\.gg|natomanga\.com)$/.test(p.host)) {
            return json({ error: 'forbidden host' }, origin, 403)
          }
          const res = await fetch(p.toString(), {
            headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,*/*;q=0.8', Referer: p.origin + '/' },
          })
          const body = await res.text()
          return json({
            status: res.status,
            len: body.length,
            challenge: body.includes('_cf_chl_opt') || body.includes('Just a moment'),
            snippet: body.slice(0, 400),
          }, origin)
        }

        if (action === 'search') {
          const q = url.searchParams.get('q') ?? ''
          if (!q) return json({ results: [] }, origin)
          const results = await scrapeSearch(q, url.origin)
          return json({ results }, origin)
        }

        if (action === 'chapters') {
          const id = url.searchParams.get('id') ?? ''
          if (!id) return json({ error: 'missing id' }, origin, 400)
          const data = await scrapeChapters(id, url.origin)
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
          const referer = url.searchParams.get('ref') ?? `${PILL}/`
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

      // uploads.mangadex.org WAF-blocks browser-UA-from-datacenter fetches (400) but
      // serves fine to an honest client with no Referer. @Home URLs are token-keyed
      // and need no Referer either.
      const headersFor = (host: string): HeadersInit =>
        host === ALLOWED_UPLOADS
          ? { Accept: 'image/*,*/*', 'User-Agent': 'YomuReader/1.0 (personal manga PWA)' }
          : {
              Accept: 'image/webp,image/jpeg,image/*,*/*',
              Referer: 'https://mangadex.org/',
              'User-Agent': BROWSER_UA,
            }
      let upstream = await fetch(parsed.toString(), {
        headers: headersFor(parsed.host),
        cf: { cacheEverything: true, cacheTtl: 86_400 },
      })
      if (!upstream.ok) {
        // MD rate-limits bursts (400) and cacheEverything then pins that error at the
        // edge. Retry with a throwaway query param — different cache key → fresh
        // upstream fetch — and don't cache the retry.
        const bust = new URL(parsed.toString())
        bust.searchParams.set('yomu-retry', crypto.randomUUID())
        upstream = await fetch(bust.toString(), {
          headers: headersFor(parsed.host),
          cf: { cacheTtl: 0 },
        })
      }
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
