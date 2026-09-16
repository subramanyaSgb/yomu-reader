import { useQuery } from '@tanstack/react-query'
import { kkSearch, kkChapters, kkPages } from './client'

export function useKakalotSearch(title: string) {
  return useQuery({
    queryKey: ['kk', 'search', title],
    enabled: title.trim().length > 0,
    queryFn: () => kkSearch(title),
    staleTime: 5 * 60 * 1000,
  })
}

export function useKakalotChapters(mangaId: string | undefined) {
  return useQuery({
    queryKey: ['kk', 'chapters', mangaId],
    enabled: !!mangaId,
    queryFn: () => kkChapters(mangaId!),
    staleTime: 10 * 60 * 1000,
  })
}

export function useKakalotPages(chapterId: string | undefined) {
  return useQuery({
    queryKey: ['kk', 'pages', chapterId],
    enabled: !!chapterId,
    queryFn: () => kkPages(chapterId!),
    staleTime: 30 * 60 * 1000,
  })
}
