// Mangakakalot provider — routes all requests through the Cloudflare Worker's /scrape endpoint.
// The Worker does the actual HTML fetching + parsing server-side (no CORS issues).

const PROXY_BASE =
  (import.meta.env?.VITE_IMAGE_PROXY as string | undefined) ?? 'http://localhost:8787'

// Any-site (web:) support is locked behind a shared key (worker secret WEB_KEY).
const WEB_KEY = (import.meta.env?.VITE_WEB_KEY as string | undefined) ?? ''
const isWeb = (id: string) => id.startsWith('web:')

/** False until VITE_WEB_KEY is configured — link-adding for other sites is then off. */
export function webEnabled(): boolean {
  return WEB_KEY.length > 0
}

export const PROXY_ORIGIN = (() => {
  try { return new URL(PROXY_BASE).origin } catch { return '' }
})()

function scrapeUrl(action: string, params: Record<string, string>): string {
  const u = new URL('/scrape', PROXY_BASE)
  u.searchParams.set('site', 'kakalot')
  u.searchParams.set('action', action)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  return u.toString()
}

export interface KakalotManga {
  id: string
  title: string
  cover: string
  kind?: string     // 'manga' | 'manhwa' | 'manhua' | ... from the source site
  source: 'kakalot'
}

export interface KakalotChapter {
  id: string        // full chapter page URL (stable ID)
  number: string | null
  title: string | null
  publishAt: string
}

export interface KakalotPage {
  src: string
}

export async function kkSearch(query: string, src?: 'buddy'): Promise<KakalotManga[]> {
  const res = await fetch(scrapeUrl('search', src ? { q: query, src } : { q: query }))
  if (!res.ok) return []
  const data = await res.json() as { results: KakalotManga[] }
  return data.results ?? []
}

export async function kkChapters(
  mangaId: string,
): Promise<{ title: string; chapters: KakalotChapter[]; cover: string; kind?: string }> {
  const res = await fetch(scrapeUrl('chapters', isWeb(mangaId) ? { id: mangaId, k: WEB_KEY } : { id: mangaId }))
  // THROW on failure/empty — returning an empty list here made TanStack cache a
  // transient upstream hiccup as "series has no chapters" for 10 minutes.
  if (!res.ok) throw new Error(`chapters fetch failed: ${res.status}`)
  const data = await res.json() as { title: string; chapters: KakalotChapter[]; cover: string; kind?: string }
  if (!data.chapters?.length) throw new Error('empty chapter list (upstream hiccup)')
  return data
}

export async function kkPages(chapterId: string): Promise<KakalotPage[]> {
  const res = await fetch(scrapeUrl('pages', isWeb(chapterId) ? { id: chapterId, k: WEB_KEY } : { id: chapterId }))
  if (!res.ok) throw new Error(`pages fetch failed: ${res.status}`)
  const data = await res.json() as { pages: KakalotPage[] }
  if (!data.pages?.length) throw new Error('empty page list (upstream hiccup)')
  return data.pages
}

/** Live source status (edge-cached 5 min) for the in-app health banner. */
export async function kkHealth(): Promise<{ weebcentral: boolean; comizy: boolean }> {
  const res = await fetch(new URL('/health', PROXY_BASE).toString())
  if (!res.ok) throw new Error(`health ${res.status}`)
  return res.json()
}

/** Proxied cover URL for a WeebCentral series id ("{ULID}/{Slug}"). */
export function kkCoverUrl(seriesId: string): string {
  const ulid = seriesId.split('/')[0]
  const u = new URL('/scrape', PROXY_BASE)
  u.searchParams.set('site', 'kakalot')
  u.searchParams.set('action', 'img')
  u.searchParams.set('u', `https://temp.compsci88.com/cover/normal/${ulid}.webp`)
  u.searchParams.set('ref', 'https://weebcentral.com/')
  return u.toString()
}

/** Build a proxied image URL for a Kakalot CDN image (needs server-side Referer). */
export function buildKakalotImageUrl(src: string, chapterUrl: string): string {
  const u = new URL('/scrape', PROXY_BASE)
  u.searchParams.set('site', 'kakalot')
  u.searchParams.set('action', 'img')
  u.searchParams.set('u', src)
  // Referer must match the chapter's own site. web: chapter ids wrap the page URL and
  // need the key (their image hosts are not on the worker's allowlist).
  try {
    const origin = new URL(isWeb(chapterUrl) ? chapterUrl.slice(4) : chapterUrl).origin + '/'
    u.searchParams.set('ref', origin)
  } catch {
    // leave ref out — worker has a default
  }
  if (isWeb(chapterUrl)) u.searchParams.set('k', WEB_KEY)
  return u.toString()
}

export type ResolvedLink =
  | { kind: 'known'; id: string; title: string; cover: string }
  | { kind: 'web'; mode: 'reader' | 'site' | 'external'; id: string; title: string; cover: string; chapters: number }

/** Classify a pasted link (our sources, or an outside site and how it can be read). */
export async function kkResolve(link: string): Promise<ResolvedLink> {
  if (!webEnabled()) throw new Error('Links from other sites need a one-time setup first (VITE_WEB_KEY on Vercel + WEB_KEY on the worker).')
  const res = await fetch(scrapeUrl('resolve', { u: link, k: WEB_KEY }))
  const data = await res.json().catch(() => null) as (ResolvedLink & { error?: string }) | null
  if (res.status === 503) throw new Error('Links from other sites are not switched on yet (the worker needs its WEB_KEY and a redeploy).')
  if (res.status === 403) throw new Error('The app and the worker have different keys (VITE_WEB_KEY / WEB_KEY).')
  if (!res.ok || !data || data.error) throw new Error(data?.error ?? `Could not check that link (${res.status}).`)
  return data
}

/** URL of the cleaned in-app view of an outside page; anchor restores the scroll spot. */
export function siteViewUrl(pageUrl: string, anchor?: { img: number; off: number }): string {
  const u = new URL('/web', PROXY_BASE)
  u.searchParams.set('k', WEB_KEY)
  u.searchParams.set('u', pageUrl)
  if (anchor && (anchor.img > 0 || anchor.off > 0)) u.hash = `y=${anchor.img},${anchor.off.toFixed(3)}`
  return u.toString()
}
