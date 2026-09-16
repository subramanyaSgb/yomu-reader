// Resolves a chapter id into proxied page image URLs.
// MangaDex: fetches @Home server, builds /img proxy URLs.
// Kakalot: scrapes chapter page via /scrape?action=pages, builds /scrape?action=img URLs.

import { useMemo } from 'react'
import { useAtHomeServer } from '../../lib/mangadex/queries'
import { buildPageProxyUrl, type ImageQuality } from '../../lib/proxy/imageUrl'
import { useKakalotPages } from '../../lib/kakalot/queries'
import { buildKakalotImageUrl } from '../../lib/kakalot/client'

export function useChapterPages(
  chapterId: string | undefined,
  quality: ImageQuality = 'source',
  source: 'mangadex' | 'kakalot' = 'mangadex',
) {
  // MangaDex path
  const atHome = useAtHomeServer(source === 'mangadex' ? chapterId : undefined)
  const mdPages = useMemo(() => {
    if (source !== 'mangadex' || !atHome.data) return null
    const { baseUrl, chapter } = atHome.data
    const files = quality === 'low' ? chapter.dataSaver : chapter.data
    return files.map((filename) => buildPageProxyUrl(baseUrl, chapter.hash, filename, quality))
  }, [source, atHome.data, quality])

  // Kakalot path — chapterId IS the chapter URL
  const kkData = useKakalotPages(source === 'kakalot' ? chapterId : undefined)
  const kkPages = useMemo(() => {
    if (source !== 'kakalot' || !kkData.data) return null
    return kkData.data.map((p) => buildKakalotImageUrl(p.src, chapterId ?? ''))
  }, [source, kkData.data, chapterId])

  if (source === 'kakalot') {
    return {
      pages: kkPages ?? [],
      isLoading: kkData.isLoading,
      isError: kkData.isError,
    }
  }
  return {
    pages: mdPages ?? [],
    isLoading: atHome.isLoading,
    isError: atHome.isError,
  }
}
