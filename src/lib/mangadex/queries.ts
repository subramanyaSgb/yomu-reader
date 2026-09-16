// TanStack Query hooks for MangaDex. All MangaDex reads go through here so caching
// and rate discipline are enforced centrally (CLAUDE.md). No ad-hoc fetches elsewhere.

import { useQuery } from '@tanstack/react-query'
import { mdGet } from './client'

// --- Minimal typings ---

export interface MDCoverArt {
  id: string
  type: 'cover_art'
  attributes: { fileName: string }
}

export interface MDManga {
  id: string
  type: 'manga'
  attributes: {
    title: Record<string, string>
    altTitles: Array<Record<string, string>>
    status: string
    year: number | null
    contentRating: string
  }
  relationships: Array<{ id: string; type: string; attributes?: { fileName?: string } }>
}

/** Best available English title: en altTitle > en title > romanized > first available. */
export function mangaEnTitle(manga: MDManga): string {
  const { title, altTitles = [] } = manga.attributes
  // Prefer explicit English alt title
  for (const alt of altTitles) {
    if (alt.en) return alt.en
  }
  // Then English title key
  if (title.en) return title.en
  // Then romanized (already Latin script)
  const roKeys = Object.keys(title).filter((k) => k.endsWith('-ro'))
  if (roKeys.length) return title[roKeys[0]]
  // Last resort: first available
  return Object.values(title)[0] ?? 'Untitled'
}

/** Extract cover URL from a manga object that was fetched with includes[]=cover_art. */
export function mangaCoverUrl(manga: MDManga): string | null {
  const rel = manga.relationships.find((r) => r.type === 'cover_art')
  const fileName = rel?.attributes?.fileName
  if (!fileName) return null
  // MangaDex cover CDN — served via uploads.mangadex.org (allowed in worker /img)
  return `https://uploads.mangadex.org/covers/${manga.id}/${fileName}.256.jpg`
}

export interface MDChapter {
  id: string
  type: 'chapter'
  attributes: {
    chapter: string | null
    title: string | null
    translatedLanguage: string
    pages: number
    publishAt: string
    externalUrl: string | null
  }
  relationships: Array<{ id: string; type: string }>
}

interface MDList<T> {
  result: string
  data: T[]
  total: number
}

export interface AtHomeServer {
  result: string
  baseUrl: string
  chapter: { hash: string; data: string[]; dataSaver: string[] }
}

// --- Hooks ---

const COVER_INCLUDE = { 'includes[]': ['cover_art'] }

/** Search manga by title (English UI). */
export function useSearch(title: string) {
  return useQuery({
    queryKey: ['md', 'search', title],
    enabled: title.trim().length > 0,
    queryFn: () =>
      mdGet<MDList<MDManga>>('/manga', {
        title,
        limit: 20,
        'contentRating[]': ['safe', 'suggestive', 'erotica', 'pornographic'],
        ...COVER_INCLUDE,
      }),
  })
}

/** English-only chapter feed, external-only chapters filtered out. */
export function useChapterFeed(mangaId: string | undefined) {
  return useQuery({
    queryKey: ['md', 'feed', mangaId],
    enabled: !!mangaId,
    queryFn: () =>
      mdGet<MDList<MDChapter>>(`/manga/${mangaId}/feed`, {
        'translatedLanguage[]': ['en'],
        'order[chapter]': 'asc',
        limit: 500,
        'includes[]': ['scanlation_group'],
      }),
  })
}

/** @Home image server. Short staleTime — baseUrl expires in ~15 min. */
export function useAtHomeServer(chapterId: string | undefined) {
  return useQuery({
    queryKey: ['md', 'athome', chapterId],
    enabled: !!chapterId,
    staleTime: 10 * 60 * 1000,
    gcTime: 12 * 60 * 1000,
    queryFn: () => mdGet<AtHomeServer>(`/at-home/server/${chapterId}`),
  })
}

/** Most-followed series (home "Popular"). */
export function usePopular() {
  return useQuery({
    queryKey: ['md', 'popular'],
    queryFn: () =>
      mdGet<MDList<MDManga>>('/manga', {
        limit: 20,
        'order[followedCount]': 'desc',
        'contentRating[]': ['safe', 'suggestive'],
        ...COVER_INCLUDE,
      }),
  })
}

/** Recently updated series (home "Latest Updates"). */
export function useLatestUpdates() {
  return useQuery({
    queryKey: ['md', 'latest'],
    staleTime: 60 * 1000,
    queryFn: () =>
      mdGet<MDList<MDManga>>('/manga', {
        limit: 20,
        'order[latestUploadedChapter]': 'desc',
        'contentRating[]': ['safe', 'suggestive'],
        ...COVER_INCLUDE,
      }),
  })
}

export interface SearchFilters {
  title?: string
  status?: string
  year?: number
  contentRating?: string[]
}

export function useAdvancedSearch(filters: SearchFilters) {
  return useQuery({
    queryKey: ['md', 'adv', filters],
    enabled: !!(filters.title || filters.status || filters.year),
    queryFn: () =>
      mdGet<MDList<MDManga>>('/manga', {
        title: filters.title,
        status: filters.status,
        year: filters.year,
        'contentRating[]': filters.contentRating ?? ['safe', 'suggestive'],
        limit: 30,
        ...COVER_INCLUDE,
      }),
  })
}

export type { MDList }
