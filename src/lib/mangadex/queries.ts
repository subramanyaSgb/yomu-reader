// TanStack Query hooks for MangaDex. All MangaDex reads go through here so caching
// and rate discipline are enforced centrally (CLAUDE.md). No ad-hoc fetches elsewhere.

import { useQuery } from '@tanstack/react-query'
import { mdGet } from './client'

// --- Minimal typings for the endpoints Phase 0 uses ---

export interface MDManga {
  id: string
  type: 'manga'
  attributes: {
    title: Record<string, string>
    status: string
    year: number | null
    contentRating: string
  }
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
  }
  relationships: Array<{ id: string; type: string }>
}

interface MDList<T> {
  result: string
  data: T[]
  total: number
}

interface MDEntity<T> {
  result: string
  data: T
}

export interface AtHomeServer {
  result: string
  baseUrl: string
  chapter: { hash: string; data: string[]; dataSaver: string[] }
}

// --- Hooks ---

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
      }),
  })
}

/** English-only chapter feed for a series, ordered by chapter number ascending. */
export function useChapterFeed(mangaId: string | undefined) {
  return useQuery({
    queryKey: ['md', 'feed', mangaId],
    enabled: !!mangaId,
    queryFn: () =>
      mdGet<MDList<MDChapter>>(`/manga/${mangaId}/feed`, {
        translatedLanguage: ['en'],
        'order[chapter]': 'asc',
        limit: 100,
        includes: ['scanlation_group'],
      }),
  })
}

/**
 * @Home image server for a chapter. Short cache — the baseUrl expires in ~15 min,
 * so we deliberately keep this fresh rather than serving a stale (dead) URL.
 */
export function useAtHomeServer(chapterId: string | undefined) {
  return useQuery({
    queryKey: ['md', 'athome', chapterId],
    enabled: !!chapterId,
    staleTime: 10 * 60 * 1000, // under the 15-min URL validity window
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
      }),
  })
}

export interface SearchFilters {
  title?: string
  status?: string // ongoing|completed|hiatus|cancelled
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
      }),
  })
}

export type { MDList, MDEntity }
