// Pure helpers for the in-app "Add series" flow (Phase 19): telling a link from a
// title, ranking search hits across sources, and mining MangaDex for the alternate
// English titles that make differently-named series findable.

import type { MDManga } from '../../lib/mangadex/queries'

export interface Hit {
  id: string
  title: string
  cover: string
}

/** The first http(s) link in a pasted/shared string, or null when it is a title. */
export function linkIn(input: string): string | null {
  const m = input.trim().match(/https?:\/\/[^\s<>"']+/i)
  if (m) return m[0].replace(/[),.;]+$/, '')
  // "weebcentral.com/series/…" typed without the scheme
  const bare = input.trim().match(/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S+$/i)
  return bare ? `https://${bare[0]}` : null
}

const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'is', 'and', 'i', 'my'])

export function titleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(w => w && !STOP.has(w))
}

/** 0..1 word overlap between two titles (order-insensitive, punctuation-proof). */
export function similarity(a: string, b: string): number {
  const ta = new Set(titleTokens(a))
  const tb = new Set(titleTokens(b))
  if (!ta.size || !tb.size) return 0
  let shared = 0
  for (const w of ta) if (tb.has(w)) shared++
  return shared / (ta.size + tb.size - shared)
}

/** Best similarity of a title against any of the names we know the series by. */
export function bestScore(title: string, names: string[]): number {
  return names.reduce((best, n) => Math.max(best, similarity(title, n)), 0)
}

/** Merge hits from several searches: de-duplicate by id, best match first,
 *  WeebCentral ahead of Comizy on a tie (it is the preferred source). */
export function rankHits(hits: Hit[], names: string[]): Hit[] {
  const byId = new Map<string, Hit>()
  for (const h of hits) if (!byId.has(h.id)) byId.set(h.id, h)
  const rank = (h: Hit) => (h.id.startsWith('buddy:') ? 1 : 0)
  return [...byId.values()]
    .map(h => ({ h, score: bestScore(h.title, names) }))
    .sort((x, y) => y.score - x.score || rank(x.h) - rank(y.h))
    .map(x => x.h)
}

const LATIN = /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}]+$/u

function namesOf(m: MDManga): string[] {
  const out: string[] = []
  const push = (v?: string) => { if (v && LATIN.test(v) && !out.includes(v)) out.push(v) }
  push(m.attributes.title.en)
  for (const alt of m.attributes.altTitles ?? []) push(alt.en)
  for (const [k, v] of Object.entries(m.attributes.title)) if (k.endsWith('-ro')) push(v)
  return out
}

/** The MangaDex entry that is the same series as `query`, if any is close enough. */
export function matchManga(list: MDManga[], query: string): MDManga | null {
  let best: MDManga | null = null
  let bestS = 0
  for (const m of list) {
    const s = bestScore(query, namesOf(m))
    if (s > bestS) { best = m; bestS = s }
  }
  return bestS >= 0.6 ? best : null
}

/** Other English names of the matched series worth searching the sources with. */
export function altTitles(m: MDManga | null, query: string, max = 3): string[] {
  if (!m) return []
  return namesOf(m).filter(n => similarity(n, query) < 0.85).slice(0, max)
}

export function genresOf(m: MDManga | null, max = 4): string[] {
  if (!m) return []
  return (m.attributes.tags ?? [])
    .filter(t => t.attributes?.group === 'genre')
    .map(t => t.attributes?.name?.en ?? '')
    .filter(Boolean)
    .slice(0, max)
}

/** "…/chapter-12/" or "Chapter 12 - Title" → "12"; drives the shelf card's Ch. badge in site mode. */
export function chapterNumberOf(url: string, title = ''): string | null {
  const t = title.match(/\b(?:chapter|chap|ch|episode|ep)\b\.?\s*[-#:]?\s*(\d+(?:\.\d+)?)/i)
  if (t) return t[1]
  let path = url
  try { path = new URL(url).pathname } catch { /* use raw */ }
  const h = path.match(/(?:chapter|chap|episode|ch|ep)[-_/]?(\d+)(?:[-_.](\d{1,2})(?!\d))?/i) ?? path.match(/\/c(\d+)(?:\.(\d+))?\/?$/i)
  return h ? (h[2] ? `${h[1]}.${h[2]}` : h[1]) : null
}

/** Which web: series a shared/pasted page link belongs to: same site, and the link's
 *  path carries the series' slug. Null when it is a new series (→ add sheet). */
export function matchSharedLink<T extends { id: string }>(link: string, entries: T[]): T | null {
  let url: URL
  try { url = new URL(link) } catch { return null }
  const host = (h: string) => h.toLowerCase().replace(/^www\./, '')
  for (const e of entries) {
    if (!e.id.startsWith('web:')) continue
    let series: URL
    try { series = new URL(e.id.slice(4)) } catch { continue }
    if (host(series.hostname) !== host(url.hostname)) continue
    const slug = (series.pathname.split('/').filter(Boolean).pop() ?? '').toLowerCase().replace(/\.html?$/, '').replace(/[.-]\d+$/, '')
    if (slug.length >= 3 && url.pathname.toLowerCase().includes(slug)) return e
  }
  return null
}
