// Resolves a chapter id into page image URLs.
// Downloaded chapters (FR-14): blob URLs straight from the Dexie byte store — fully
// offline, no network touched. Otherwise:
// MangaDex: fetches @Home server, builds /img proxy URLs.
// Kakalot/WeebCentral/Comizy: /scrape?action=pages, builds /scrape?action=img URLs.

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { db } from '../../lib/db/schema'
import { useAtHomeServer } from '../../lib/mangadex/queries'
import { buildPageProxyUrl, type ImageQuality } from '../../lib/proxy/imageUrl'
import { useKakalotPages } from '../../lib/kakalot/queries'
import { buildKakalotImageUrl } from '../../lib/kakalot/client'

/** Blob URLs for a fully-downloaded chapter, or null. */
function useDownloadedPages(chapterId: string | undefined) {
  return useQuery({
    queryKey: ['downloaded', chapterId],
    enabled: !!chapterId,
    staleTime: Infinity,
    queryFn: async (): Promise<string[] | null> => {
      const d = await db.downloads.get(chapterId!)
      if (d?.status !== 'done') return null
      const rows = await db.imageBytes.where('chapterId').equals(chapterId!).sortBy('pageIndex')
      if (rows.length === 0) return null
      return rows.map(r => URL.createObjectURL(r.blob))
    },
  })
}

export function useChapterPages(
  chapterId: string | undefined,
  quality: ImageQuality = 'source',
  source: 'mangadex' | 'kakalot' = 'mangadex',
) {
  const downloaded = useDownloadedPages(chapterId)
  const hasLocal = !!downloaded.data
  const [localPages, setLocalPages] = useState<string[] | null>(null)
  useEffect(() => {
    setLocalPages(downloaded.data ?? null)
    return () => { downloaded.data?.forEach(u => URL.revokeObjectURL(u)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloaded.data])

  // MangaDex path (skipped entirely when the chapter is stored locally)
  const atHome = useAtHomeServer(source === 'mangadex' && !hasLocal && !downloaded.isLoading ? chapterId : undefined)
  const mdPages = useMemo(() => {
    if (source !== 'mangadex' || !atHome.data) return null
    const { baseUrl, chapter } = atHome.data
    const files = quality === 'low' ? chapter.dataSaver : chapter.data
    return files.map((filename) => buildPageProxyUrl(baseUrl, chapter.hash, filename, quality))
  }, [source, atHome.data, quality])

  // Kakalot path — chapterId IS the chapter URL (or buddy:{slug}:{chapterSlug})
  const kkData = useKakalotPages(source === 'kakalot' && !hasLocal && !downloaded.isLoading ? chapterId : undefined)
  const kkPages = useMemo(() => {
    if (source !== 'kakalot' || !kkData.data) return null
    return kkData.data.map((p) => buildKakalotImageUrl(p.src, chapterId ?? ''))
  }, [source, kkData.data, chapterId])

  if (localPages) {
    return { pages: localPages, isLoading: false, isError: false }
  }
  if (source === 'kakalot') {
    return {
      pages: kkPages ?? [],
      isLoading: downloaded.isLoading || kkData.isLoading,
      isError: kkData.isError,
    }
  }
  return {
    pages: mdPages ?? [],
    isLoading: downloaded.isLoading || atHome.isLoading,
    isError: atHome.isError,
  }
}
