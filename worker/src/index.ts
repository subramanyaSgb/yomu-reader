// Yomu proxy — Cloudflare Worker.
// Two routes:
//   GET /img?u=<encoded @Home page URL>&q=<source|low>  — image proxy (CORS-locked image servers)
//   GET /api/<path>?<qs>                                — MangaDex API proxy (CORS-locked from vercel.app)
//
// SECURITY: restricted proxy — /img only allows MangaDex @Home hosts; /api only allows api.mangadex.org.

const ALLOWED_IMAGE_HOST = /(^|\.)mangadex\.network$/
const ALLOWED_UPLOADS = 'uploads.mangadex.org'
const MANGADEX_API = 'https://api.mangadex.org'

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

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin')

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    const url = new URL(request.url)

    // --- /api proxy: forward to api.mangadex.org ---
    if (url.pathname.startsWith('/api/')) {
      const mdPath = url.pathname.slice(4) // strip /api -> /manga, /at-home/...
      const mdUrl = new URL(MANGADEX_API + mdPath)
      // Forward all query params
      url.searchParams.forEach((v, k) => mdUrl.searchParams.append(k, v))

      const upstream = await fetch(mdUrl.toString(), {
        cf: { cacheTtl: 60, cacheEverything: true },
      })

      const headers = new Headers(corsHeaders(origin))
      headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'application/json')
      // Don't cache errors
      if (upstream.ok) headers.set('Cache-Control', 'public, max-age=60, s-maxage=60')

      return new Response(upstream.body, { status: upstream.status, headers })
    }

    // --- /img proxy: stream MangaDex @Home image bytes ---
    if (url.pathname === '/img') {
      const target = url.searchParams.get('u')
      if (!target) return new Response('Missing u', { status: 400, headers: corsHeaders(origin) })

      let parsed: URL
      try {
        parsed = new URL(target)
      } catch {
        return new Response('Bad u', { status: 400, headers: corsHeaders(origin) })
      }

      if (parsed.protocol !== 'https:' || !isAllowedImage(parsed.host)) {
        return new Response('Forbidden host', { status: 403, headers: corsHeaders(origin) })
      }

      const upstream = await fetch(parsed.toString(), {
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

    return new Response('Not found', { status: 404, headers: corsHeaders(origin) })
  },
}
