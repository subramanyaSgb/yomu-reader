// Yomu proxy — Cloudflare Worker.
// Routes:
//   GET /img?u=<encoded @Home URL>&q=<source|low>   — MangaDex image proxy
//   GET /api/<path>?<qs>                             — MangaDex API proxy (CORS-locked from browser)
//   GET /comick/<path>?<qs>                          — Comick API proxy
//   GET /scrape?site=kakalot&action=<...>&<params>   — fallback-source scraper (WeebCentral upstream)
//
// NOTE: the wire key stays `site=kakalot` / source:'kakalot' for backward compat with the
// deployed frontend and stored library data, but the upstream is now WeebCentral.
// History: Mangakakalot network → CF managed challenges block Worker fetches (2026-09);
// Mangapill → no challenge but licensed manhwa (Solo Leveling etc.) removed from catalog
// and search ranks light novels first. WeebCentral has complete chapter lists including
// licensed manhwa, no challenge, and comics only (no light novels).
//
// SECURITY: restricted proxy — each route only allows its specific upstream host(s).

const ALLOWED_IMAGE_HOST = /(^|\.)mangadex\.network$/
const ALLOWED_UPLOADS = 'uploads.mangadex.org'
const MANGADEX_API = 'https://api.mangadex.org'
const COMICK_API = 'https://api.comick.dev'

// WeebCentral (fallback reading source — complete chapter lists incl. licensed manhwa)
const WC = 'https://weebcentral.com'
const WC_COVER_CDN = 'https://temp.compsci88.com'
// MangaSee-lineage image CDNs used by WeebCentral chapters + covers,
// plus Comizy CDNs for the buddy: fallback source
const WC_IMG_HOST = /(^|\.)(planeptune\.us|lowee\.us|lastation\.us|compsci88\.com|weebcentral\.com|cmzcdn\.org|comizy\.io)$/

// Comizy (mangabuddy.com successor) — secondary source for titles WeebCentral lacks.
// Catalog ids are "buddy:{titleId}:{slug}"; chapter ids "buddy:{titleId}:{chapterId}".
const COMIZY_API = 'https://api.comizy.io'
const COMIZY_REF = 'https://comizy.io/'

async function comizyGet(path: string): Promise<any | null> {
  const res = await fetch(COMIZY_API + path, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json', Referer: COMIZY_REF },
    cf: { cacheEverything: true, cacheTtl: 600 },
  })
  if (!res.ok) return null
  return res.json()
}

/** Comizy search (for per-series source switching): results in the same shape as WC. */
async function buddySearch(query: string, workerOrigin: string): Promise<KakalotManga[]> {
  const res = await fetch(`https://comizy.io/search?q=${encodeURIComponent(query.trim())}`, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,*/*;q=0.8', Referer: COMIZY_REF },
    cf: { cacheEverything: true, cacheTtl: 600 },
  })
  if (!res.ok) return []
  const html = await res.text()
  const jsonText = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/)?.[1]
  if (!jsonText) return []
  try {
    const items: any[] = JSON.parse(jsonText)?.props?.pageProps?.ssrItems ?? []
    return items.slice(0, 8).map((it) => ({
      id: `buddy:${it.id}:${it.slug}`,
      title: it.name ?? it.slug,
      cover: it.cover ? proxiedImageUrl(workerOrigin, it.cover) : '',
      kind: 'manhwa',
      source: 'kakalot' as const,
    }))
  } catch {
    return []
  }
}

async function buddyChapters(
  id: string, // buddy:{titleId}:{mangaSlug}
  workerOrigin: string,
): Promise<{ title: string; chapters: KakalotChapter[]; cover: string; kind: string }> {
  const [, titleId, mangaSlug] = id.split(':')
  const [det, list] = await Promise.all([
    comizyGet(`/titles/${titleId}`),
    comizyGet(`/titles/${titleId}/chapters`),
  ])
  const raw: any[] = list?.data?.chapters ?? []
  const chapters: KakalotChapter[] = raw.map((c) => ({
    // Pages come from the chapter PAGE (the images API truncates to 3 without auth),
    // so the chapter id carries the slugs the page URL needs.
    id: `buddy:${mangaSlug}:${c.slug}`,
    number: String(c.name ?? '').match(/(\d+(?:\.\d+)?)\s*$/)?.[1] ?? null,
    title: c.name ?? null,
    publishAt: c.updated_at ?? '',
  })).reverse() // API is newest-first; reader wants ascending
  const t = det?.data?.title
  const cover = t?.cover ? proxiedImageUrl(workerOrigin, t.cover) : ''
  return { title: t?.name ?? '', chapters, cover, kind: 'manhwa' }
}

async function buddyPages(id: string): Promise<KakalotPage[]> {
  // buddy:{mangaSlug}:{chapterSlug} → full image list lives in the chapter page's
  // __NEXT_DATA__ (initialChapter.images); the JSON API truncates without auth.
  const [, mangaSlug, chapterSlug] = id.split(':')
  const res = await fetch(`https://comizy.io/${mangaSlug}/${chapterSlug}`, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,*/*;q=0.8', Referer: COMIZY_REF },
    cf: { cacheEverything: true, cacheTtl: 3600 },
  })
  if (!res.ok) return []
  const html = await res.text()
  const jsonText = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/)?.[1]
  if (!jsonText) return []
  try {
    const data = JSON.parse(jsonText)
    const images: string[] = data?.props?.pageProps?.initialChapter?.images ?? []
    return images.filter((s) => typeof s === 'string').map((src) => ({ src }))
  } catch {
    return []
  }
}
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

function isAllowedImage(host: string): boolean {
  return ALLOWED_IMAGE_HOST.test(host) || host === ALLOWED_UPLOADS
}

function corsHeaders(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

function json(data: unknown, origin: string | null, status = 200, browserTtl = 0): Response {
  const h = new Headers(corsHeaders(origin))
  h.set('Content-Type', 'application/json')
  if (status === 200 && browserTtl > 0) h.set('Cache-Control', `public, max-age=${browserTtl}`)
  return new Response(JSON.stringify(data), { status, headers: h })
}

// --- WeebCentral scraper helpers (regex over server-rendered HTML/HTMX fragments) ---

interface KakalotManga {
  id: string        // WeebCentral path after /series/, e.g. "01J76XYCPSY3C4BNPBRY8JMCBE/Solo-Leveling"
  title: string
  cover: string     // pre-proxied through this worker's img action
  kind: string      // 'manga' | 'manhwa' | 'manhua' | ... (lowercased site type)
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

async function wcFetch(url: string, cacheTtl = 600): Promise<string | null> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      Referer: WC + '/',
    },
    // Edge-cache upstream HTML so repeat scrapes don't re-hit WC (rate-limit friendly).
    cf: { cacheEverything: true, cacheTtl },
  })
  if (!res.ok) return null
  return res.text()
}

// Build a URL that serves an upstream image through this worker (CORS + cache).
function proxiedImageUrl(workerOrigin: string, src: string): string {
  return `${workerOrigin}/scrape?site=kakalot&action=img&u=${encodeURIComponent(src)}&ref=${encodeURIComponent(WC + '/')}`
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'")
    .trim()
}

function wcCoverUrl(seriesUlid: string): string {
  return `${WC_COVER_CDN}/cover/normal/${seriesUlid}.webp`
}

async function scrapeSearch(query: string, workerOrigin: string): Promise<KakalotManga[]> {
  // WC search is strict AND-matching, so "Omniscient Reader's Viewpoint" finds nothing
  // while its WC title is "Omniscient Reader". Ladder: full query → possessives/punctuation
  // stripped → progressively drop trailing words.
  const attempts: string[] = []
  const push = (s: string) => { if (s && !attempts.includes(s)) attempts.push(s) }
  push(query.trim())
  const cleaned = query.replace(/['’]s\b/gi, '').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim()
  push(cleaned)
  const words = cleaned.split(' ')
  for (let n = words.length - 1; n >= 1 && attempts.length < 6; n--) push(words.slice(0, n).join(' '))

  for (const attempt of attempts) {
    const results = await wcSearchOnce(attempt, workerOrigin)
    if (results.length) return results
  }
  return []
}

async function wcSearchOnce(query: string, workerOrigin: string): Promise<KakalotManga[]> {
  const q = encodeURIComponent(query)
  const html = await wcFetch(
    `${WC}/search/data?limit=24&offset=0&text=${q}&sort=Best%20Match&order=Ascending&official=Any&display_mode=Full%20Display`,
  )
  if (!html) return []

  // One <article class="bg-base-300…"> per result. Within it:
  //   <a href="https://weebcentral.com/series/{ULID}/{Slug}">
  //   <img … alt="{Title} cover" …>
  //   <span class="tooltip …" data-tip="{Manhwa|Manga|Manhua|…}">
  const results: KakalotManga[] = []
  const cards = html.split('<article class="bg-base-300')
  for (const card of cards.slice(1)) {
    const link = card.match(/href="https:\/\/weebcentral\.com\/series\/([A-Z0-9]+)\/([^"]+)"/)
    if (!link) continue
    const title = card.match(/alt="([^"]+) cover"/)?.[1] ?? link[2].replace(/-/g, ' ')
    const kind = (card.match(/data-tip="(Manga|Manhwa|Manhua|OEL|Comic)"/i)?.[1] ?? 'manga').toLowerCase()
    results.push({
      id: `${link[1]}/${link[2]}`,
      title: decodeEntities(title),
      cover: proxiedImageUrl(workerOrigin, wcCoverUrl(link[1])),
      kind,
      source: 'kakalot',
    })
    if (results.length >= 24) break
  }
  return results
}

async function scrapeChapters(
  mangaId: string,
  workerOrigin: string,
): Promise<{ title: string; chapters: KakalotChapter[]; cover: string; kind: string }> {
  const ulid = mangaId.split('/')[0]
  // Chapter list is a separate HTMX fragment; series page supplies title + type.
  const [listHtml, pageHtml] = await Promise.all([
    wcFetch(`${WC}/series/${ulid}/full-chapter-list`),
    wcFetch(`${WC}/series/${mangaId}`),
  ])
  if (!listHtml) return { title: '', chapters: [], cover: '', kind: 'manga' }

  const title = decodeEntities(pageHtml?.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] ?? '')
  // Type appears in the meta description: "Read {Title} {Type} online for free…"
  const kind = (pageHtml?.match(/Read .+ (Manga|Manhwa|Manhua|OEL|Comic) online/i)?.[1] ?? 'manga').toLowerCase()

  // Each row carries its publish timestamp in checkNewChapter('<ISO>') just before the
  // anchor — captured so the app can show recency and predict next-chapter dates.
  const chapters: KakalotChapter[] = []
  for (const m of listHtml.matchAll(/checkNewChapter\('([^']+)'\)[\s\S]{0,900}?href="(?:https:\/\/weebcentral\.com)?(\/chapters\/[A-Z0-9]+)"[\s\S]{0,600}?<span class="">([^<]+)<\/span>/g)) {
    const label = decodeEntities(m[3])
    const num = label.match(/(\d+(?:\.\d+)?)\s*$/)?.[1] ?? null
    chapters.push({
      id: WC + m[2],
      number: num,
      title: label,
      publishAt: m[1],
    })
  }
  // List is newest-first; reverse to ascending for the reader.
  return {
    title,
    chapters: chapters.reverse(),
    cover: proxiedImageUrl(workerOrigin, wcCoverUrl(ulid)),
    kind,
  }
}

async function scrapePages(chapterUrl: string): Promise<KakalotPage[]> {
  let parsed: URL
  try { parsed = new URL(chapterUrl) } catch { return [] }
  if (parsed.host !== 'weebcentral.com' && parsed.host !== 'www.weebcentral.com') return []

  const html = await wcFetch(`${parsed.origin}${parsed.pathname}/images?is_prev=False&current_page=1&reading_style=long_strip`)
  if (!html) return []

  const pages: KakalotPage[] = []
  for (const m of html.matchAll(/<img[^>]*src="(https:\/\/[^"]+)"/g)) {
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
  if (!WC_IMG_HOST.test(parsed.host)) {
    return new Response('Forbidden host', { status: 403, headers: corsHeaders(origin) })
  }

  // Referer must match the host's own site — clients can't know that mapping.
  const effectiveReferer = /(cmzcdn\.org|comizy\.io)$/.test(parsed.host) ? COMIZY_REF : referer
  const upHeaders = { Referer: effectiveReferer, 'User-Agent': BROWSER_UA }

  let upstream = await fetch(imageUrl, {
    headers: upHeaders,
    cf: { cacheEverything: true, cacheTtl: 86_400 },
  })
  if (!upstream.ok) {
    // Same lesson as /img: cacheEverything can pin a transient upstream error at the
    // edge — retry once with a throwaway param (fresh cache key, retry not cached).
    const bust = new URL(parsed.toString())
    bust.searchParams.set('yomu-retry', crypto.randomUUID())
    upstream = await fetch(bust.toString(), { headers: upHeaders, cf: { cacheTtl: 0 } })
  }
  if (!upstream.ok) {
    return new Response('Upstream error', { status: upstream.status, headers: corsHeaders(origin) })
  }
  const headers = new Headers(corsHeaders(origin))
  headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'image/jpeg')
  headers.set('Cache-Control', 'public, max-age=86400, immutable')
  return new Response(upstream.body, { status: 200, headers })
}

// --- Push notifications (Web Push, no Firebase) ---
// Payload-free "tickle" pushes: the SW wakes, fetches /push/pending and shows the
// notifications. Empty-body pushes need no RFC8291 encryption — only a VAPID JWT.

interface Env {
  PUSH_KV: KVNamespace
  VAPID_PUBLIC: string
  VAPID_PRIVATE: string
}

interface PushSub { endpoint: string; keys?: Record<string, string> }
interface SeriesState { id: string; title: string; lastNumber: string | null }

const te = (s: string) => new TextEncoder().encode(s)

function b64u(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64uToBytes(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

async function endpointKey(endpoint: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', te(endpoint))
  return b64u(h).slice(0, 20)
}

async function vapidJwt(aud: string, env: Env): Promise<string> {
  const pub = b64uToBytes(env.VAPID_PUBLIC) // uncompressed point: 0x04 || x || y
  const jwk = {
    kty: 'EC', crv: 'P-256',
    x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)),
    d: env.VAPID_PRIVATE, ext: true,
  }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const header = b64u(te(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = b64u(te(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:owner@yomu-reader.app' })))
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te(`${header}.${payload}`))
  return `${header}.${payload}.${b64u(sig)}`
}

async function sendTickle(sub: PushSub, env: Env): Promise<number> {
  const jwt = await vapidJwt(new URL(sub.endpoint).origin, env)
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { TTL: '86400', Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC}` },
  })
  return res.status
}

/** Latest chapter number for a series id (WC or buddy:), cheap + edge-cached. */
async function latestChapterNumber(id: string): Promise<string | null> {
  if (id.startsWith('buddy:')) {
    const titleId = id.split(':')[1]
    const list = await comizyGet(`/titles/${titleId}/chapters`)
    const name: string | undefined = list?.data?.chapters?.[0]?.name
    return name?.match(/(\d+(?:\.\d+)?)\s*$/)?.[1] ?? null
  }
  const ulid = id.split('/')[0]
  const html = await wcFetch(`${WC}/series/${ulid}/full-chapter-list`, 3600)
  // List is newest-first — the first label is the latest chapter.
  return html?.match(/<span class="">([^<]*?(\d+(?:\.\d+)?))<\/span>/)?.[2] ?? null
}

async function handlePush(request: Request, env: Env, origin: string | null): Promise<Response> {
  const url = new URL(request.url)

  if (url.pathname === '/push/vapid') {
    return json({ publicKey: env.VAPID_PUBLIC }, origin, 200, 3600)
  }

  if (request.method !== 'POST') return json({ error: 'POST required' }, origin, 405)
  const body = await request.json().catch(() => null) as
    | { subscription?: PushSub; endpoint?: string; series?: SeriesState[] } | null
  if (!body) return json({ error: 'bad body' }, origin, 400)

  if (url.pathname === '/push/subscribe' && body.subscription?.endpoint) {
    const k = await endpointKey(body.subscription.endpoint)
    await env.PUSH_KV.put(`sub:${k}`, JSON.stringify(body.subscription))
    if (body.series) await env.PUSH_KV.put(`state:${k}`, JSON.stringify(body.series))
    return json({ ok: true }, origin)
  }
  if (url.pathname === '/push/state' && body.endpoint && body.series) {
    const k = await endpointKey(body.endpoint)
    await env.PUSH_KV.put(`state:${k}`, JSON.stringify(body.series))
    return json({ ok: true }, origin)
  }
  if (url.pathname === '/push/unsubscribe' && body.endpoint) {
    const k = await endpointKey(body.endpoint)
    await Promise.all(['sub', 'state', 'notified', 'pending'].map(p => env.PUSH_KV.delete(`${p}:${k}`)))
    return json({ ok: true }, origin)
  }
  if (url.pathname === '/push/pending' && body.endpoint) {
    const k = await endpointKey(body.endpoint)
    const pending = await env.PUSH_KV.get(`pending:${k}`)
    await env.PUSH_KV.delete(`pending:${k}`)
    return json({ items: pending ? JSON.parse(pending) : [] }, origin)
  }
  return json({ error: 'unknown push route' }, origin, 404)
}

/** Cron: for every subscriber, compare each notify-enabled series' latest chapter
 *  with what we last announced; queue messages and send a tickle. */
async function checkAndNotify(env: Env): Promise<void> {
  const subs = await env.PUSH_KV.list({ prefix: 'sub:' })
  for (const entry of subs.keys) {
    const k = entry.name.slice(4)
    const [subRaw, stateRaw, notifiedRaw] = await Promise.all([
      env.PUSH_KV.get(`sub:${k}`),
      env.PUSH_KV.get(`state:${k}`),
      env.PUSH_KV.get(`notified:${k}`),
    ])
    if (!subRaw || !stateRaw) continue
    const series: SeriesState[] = JSON.parse(stateRaw)
    const notified: Record<string, string> = notifiedRaw ? JSON.parse(notifiedRaw) : {}
    const fresh: Array<{ title: string; number: string }> = []

    for (const s of series.slice(0, 30)) {
      try {
        const latest = await latestChapterNumber(s.id)
        if (!latest) continue
        const seen = Math.max(parseFloat(notified[s.id] ?? '-1'), parseFloat(s.lastNumber ?? '-1'))
        if (parseFloat(latest) > seen) {
          fresh.push({ title: s.title, number: latest })
          notified[s.id] = latest
        }
      } catch { /* per-series best effort */ }
    }

    if (fresh.length === 0) continue
    const pendingRaw = await env.PUSH_KV.get(`pending:${k}`)
    const pending = pendingRaw ? JSON.parse(pendingRaw) : []
    await env.PUSH_KV.put(`pending:${k}`, JSON.stringify([...pending, ...fresh].slice(-20)))
    await env.PUSH_KV.put(`notified:${k}`, JSON.stringify(notified))
    const status = await sendTickle(JSON.parse(subRaw), env)
    if (status === 404 || status === 410) {
      await Promise.all(['sub', 'state', 'notified', 'pending'].map(p => env.PUSH_KV.delete(`${p}:${k}`)))
    }
  }
}

// --- Main handler ---

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(checkAndNotify(env))
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin')

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    const url = new URL(request.url)

    // /push/* — Web Push subscription/state/pending
    if (url.pathname.startsWith('/push/')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
      return handlePush(request, env, origin)
    }

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
          if (!/(^|\.)(mangapill\.com|readdetectiveconan\.com|mangakakalot\.gg|natomanga\.com|weebcentral\.com|planeptune\.us)$/.test(p.host)) {
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
          const results = url.searchParams.get('src') === 'buddy'
            ? await buddySearch(q, url.origin)
            : await scrapeSearch(q, url.origin)
          // Only cache non-empty results (an empty set may be a transient upstream hiccup)
          return json({ results }, origin, 200, results.length ? 600 : 0)
        }

        if (action === 'chapters') {
          const id = url.searchParams.get('id') ?? ''
          if (!id) return json({ error: 'missing id' }, origin, 400)
          const data = id.startsWith('buddy:')
            ? await buddyChapters(id, url.origin)
            : await scrapeChapters(id, url.origin)
          // Empty chapter list = upstream hiccup, never a valid answer for a real
          // series — signal an error so clients retry instead of caching emptiness.
          return json(data, origin, data.chapters.length ? 200 : 503, data.chapters.length ? 600 : 0)
        }

        if (action === 'pages') {
          const id = url.searchParams.get('id') ?? ''
          if (!id) return json({ error: 'missing id' }, origin, 400)
          // id IS the full chapter URL (WC) or buddy:{titleId}:{chapterId} (Comizy)
          const pages = id.startsWith('buddy:') ? await buddyPages(id) : await scrapePages(id)
          return json({ pages }, origin, pages.length ? 200 : 503, pages.length ? 3600 : 0)
        }

        if (action === 'img') {
          const imageUrl = url.searchParams.get('u') ?? ''
          const referer = url.searchParams.get('ref') ?? `${WC}/`
          return proxyKakalotImage(imageUrl, referer, origin)
        }

        return json({ error: 'unknown action' }, origin, 400)
      } catch (e) {
        return json({ error: String(e) }, origin, 500)
      }
    }

    // /health — live source status for the in-app banner (both checks in parallel,
    // generous edge cache so shelf opens don't hammer the sources).
    if (url.pathname === '/health') {
      const [wc, buddy] = await Promise.all([
        fetch(`${WC}/series/01J76XYCPSY3C4BNPBRY8JMCBE/full-chapter-list`, {
          headers: { 'User-Agent': BROWSER_UA },
          cf: { cacheEverything: true, cacheTtl: 300 },
        }).then(r => r.ok).catch(() => false),
        fetch(`${COMIZY_API}/titles/Gj7042Ov/chapters`, {
          headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' },
          cf: { cacheEverything: true, cacheTtl: 300 },
        }).then(r => r.ok).catch(() => false),
      ])
      return json({ weebcentral: wc, comizy: buddy }, origin, 200, 300)
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
