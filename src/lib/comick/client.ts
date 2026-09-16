// Comick provider — clean JSON API, routed through the Cloudflare Worker's /comick proxy
// (api.comick.dev is CORS-locked from the browser). Used for discovery + chapter listings.
// Page images are NOT exposed by Comick's API — reading falls back to MangaDex/Kakalot.
//
// Cover images come from meo.comick.pictures, which has Access-Control-Allow-Origin: * —
// so covers load directly in the browser (no proxy). See comickCoverUrl().

const PROXY_BASE =
  (import.meta.env?.VITE_IMAGE_PROXY as string | undefined) ?? 'http://localhost:8787'

const COVER_CDN = 'https://meo.comick.pictures'

function apiUrl(path: string, params: Record<string, string | number | boolean> = {}): string {
  // path like "/v1.0/search" — the worker prefixes api.comick.dev
  const u = new URL('/comick' + path, PROXY_BASE)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v))
  return u.toString()
}

export interface ComickSearchItem {
  id: number
  hid: string
  slug: string
  title: string
  rating: string | null
  bayesian_rating: string | null
  status: number // 1 ongoing, 2 completed, 3 cancelled, 4 hiatus
  last_chapter: number | null
  content_rating: string
  md_covers?: { b2key: string; w?: number; h?: number }[]
  desc?: string
}

export interface ComickCover {
  vol?: string | null
  w?: number
  h?: number
  b2key: string
}

export interface ComickComic {
  id: number
  hid: string
  title: string
  country: string
  status: number
  last_chapter: number | null
  chapter_count: number | null
  desc: string
  slug: string
  year: number | null
  bayesian_rating: string | null
  rating_count: number | null
  content_rating: string
  md_covers?: ComickCover[]
  md_comic_md_genres?: { md_genres: { name: string; group?: string; slug?: string } }[]
}

export interface ComickChapter {
  hid: string
  chap: string | null
  vol: string | null
  title: string | null
  lang: string
  group_name: string[] | null
  up_count?: number
  external?: string | null // set for licensed/external chapters — not readable on Comick
  publish_at?: string
}

/** Cover CDN URL — direct, meo.comick.pictures serves CORS * (no proxy needed). */
export function comickCoverUrl(b2key: string | undefined | null): string | null {
  if (!b2key) return null
  return `${COVER_CDN}/${b2key}`
}

export function comickCoverFrom(covers: { b2key: string }[] | undefined): string | null {
  return comickCoverUrl(covers?.[0]?.b2key)
}

export async function comickSearch(query: string): Promise<ComickSearchItem[]> {
  const res = await fetch(apiUrl('/v1.0/search', { q: query, limit: 24, t: false }))
  if (!res.ok) return []
  const data = (await res.json()) as ComickSearchItem[]
  return Array.isArray(data) ? data : []
}

/** Discovery lists. sort: 'follow' | 'view' | 'rating' | 'uploaded' */
export async function comickTop(
  sort: 'follow' | 'view' | 'rating' | 'uploaded' = 'follow',
): Promise<ComickSearchItem[]> {
  const res = await fetch(apiUrl('/v1.0/search', { type: 'comic', sort, limit: 24, t: false }))
  if (!res.ok) return []
  const data = (await res.json()) as ComickSearchItem[]
  return Array.isArray(data) ? data : []
}

export async function comickComic(slugOrHid: string): Promise<ComickComic | null> {
  const res = await fetch(apiUrl(`/comic/${slugOrHid}/`))
  if (!res.ok) return null
  const data = (await res.json()) as { comic?: ComickComic }
  return data.comic ?? null
}

export async function comickChapters(
  hid: string,
  page = 1,
): Promise<{ chapters: ComickChapter[]; total: number }> {
  const res = await fetch(apiUrl(`/comic/${hid}/chapters`, { lang: 'en', limit: 60, page }))
  if (!res.ok) return { chapters: [], total: 0 }
  const data = (await res.json()) as { chapters?: ComickChapter[]; total?: number }
  return { chapters: data.chapters ?? [], total: data.total ?? 0 }
}
