// Yomu image proxy — Cloudflare Worker.
// TDD §3.3. Reason it exists: MangaDex @Home image URLs are CORS-locked to MD domains +
// localhost, so the PWA cannot fetch them directly. This Worker fetches server-side
// (no CORS in a Worker) and streams bytes back with permissive CORS. Cloudflare egress
// is free, which is why images go here and not through Vercel.
//
// Route: GET /img?u=<encoded @Home page URL>&q=<source|low>
//
// SECURITY: this is a RESTRICTED proxy — `u` must be a MangaDex @Home host, else 403.
// Never let it become an open proxy.

const ALLOWED_HOST = /(^|\.)mangadex\.network$/
const ALLOWED_UPLOADS = 'uploads.mangadex.org'

function isAllowed(host: string): boolean {
  return ALLOWED_HOST.test(host) || host === ALLOWED_UPLOADS
}

function corsHeaders(origin: string | null): HeadersInit {
  // ponytail: reflect any origin for personal use; lock to app origin in Phase 6.
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
    if (url.pathname !== '/img') {
      return new Response('Not found', { status: 404, headers: corsHeaders(origin) })
    }

    const target = url.searchParams.get('u')
    if (!target) {
      return new Response('Missing u', { status: 400, headers: corsHeaders(origin) })
    }

    let parsed: URL
    try {
      parsed = new URL(target)
    } catch {
      return new Response('Bad u', { status: 400, headers: corsHeaders(origin) })
    }

    if (parsed.protocol !== 'https:' || !isAllowed(parsed.host)) {
      // Restricted proxy — refuse anything not a MangaDex @Home host.
      return new Response('Forbidden host', { status: 403, headers: corsHeaders(origin) })
    }

    // Fetch server-side. Do NOT send auth headers to image servers (they reject them).
    const upstream = await fetch(parsed.toString(), {
      cf: { cacheEverything: true, cacheTtl: 86_400 }, // edge-cache images 1 day
    })

    if (!upstream.ok) {
      return new Response('Upstream error', {
        status: upstream.status,
        headers: corsHeaders(origin),
      })
    }

    const headers = new Headers(corsHeaders(origin))
    headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'image/jpeg')
    headers.set('Cache-Control', 'public, max-age=86400, immutable')

    // ponytail: q=low recompression is a Phase 5 (data-saver) concern; pass through for now.
    return new Response(upstream.body, { status: 200, headers })
  },
}
