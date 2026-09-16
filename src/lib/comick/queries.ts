import { useQuery } from '@tanstack/react-query'
import { comickSearch, comickTop, comickComic, comickChapters } from './client'

export function useComickSearch(query: string) {
  return useQuery({
    queryKey: ['ck', 'search', query],
    enabled: query.trim().length > 0,
    queryFn: () => comickSearch(query),
    staleTime: 5 * 60 * 1000,
  })
}

export function useComickTop(sort: 'follow' | 'view' | 'rating' | 'uploaded' = 'follow') {
  return useQuery({
    queryKey: ['ck', 'top', sort],
    queryFn: () => comickTop(sort),
    staleTime: 10 * 60 * 1000,
  })
}

export function useComickComic(slugOrHid: string | undefined) {
  return useQuery({
    queryKey: ['ck', 'comic', slugOrHid],
    enabled: !!slugOrHid,
    queryFn: () => comickComic(slugOrHid!),
    staleTime: 10 * 60 * 1000,
  })
}

export function useComickChapters(hid: string | undefined) {
  return useQuery({
    queryKey: ['ck', 'chapters', hid],
    enabled: !!hid,
    queryFn: () => comickChapters(hid!),
    staleTime: 10 * 60 * 1000,
  })
}
