// Mangakakalot provider — routes all requests through the Cloudflare Worker's /scrape endpoint.
// The Worker does the actual HTML fetching + parsing server-side (no CORS issues).

const PROXY_BASE =
  (import.meta.env?.VITE_IMAGE_PROXY as string | undefined) ?? 'http://localhost:8787'

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

export async function kkSearch(query: string): Promise<KakalotManga[]> {
  const res = await fetch(scrapeUrl('search', { q: query }))
  if (!res.ok) return []
  const data = await res.json() as { results: KakalotManga[] }
  return data.results ?? []
}

export async function kkChapters(
  mangaId: string,
): Promise<{ title: string; chapters: KakalotChapter[]; cover: string; kind?: string }> {
  const res = await fetch(scrapeUrl('chapters', { id: mangaId }))
  if (!res.ok) return { title: '', chapters: [], cover: '' }
  return res.json()
}

export async function kkPages(chapterId: string): Promise<KakalotPage[]> {
  const res = await fetch(scrapeUrl('pages', { id: chapterId }))
  if (!res.ok) return []
  const data = await res.json() as { pages: KakalotPage[] }
  return data.pages ?? []
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
  // Referer must match the chapter's domain (chapmanganato.to or mangakakalot.gg)
  try {
    const origin = new URL(chapterUrl).origin + '/'
    u.searchParams.set('ref', origin)
  } catch {
    // leave ref out — worker has a default
  }
  return u.toString()
}
