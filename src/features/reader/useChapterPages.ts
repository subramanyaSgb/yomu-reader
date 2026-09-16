// Turns a chapter id into proxied page URLs (FR-1/§3.2). All image URLs come from the
// proxy helper — never a direct MangaDex URL (CLAUDE.md hard rule).

import { useMemo } from 'react'
import { useAtHomeServer } from '../../lib/mangadex/queries'
import { buildPageProxyUrl, type ImageQuality } from '../../lib/proxy/imageUrl'

export function useChapterPages(
  chapterId: string | undefined,
  quality: ImageQuality = 'source',
) {
  const atHome = useAtHomeServer(chapterId)

  const pages = useMemo(() => {
    if (!atHome.data) return []
    const { baseUrl, chapter } = atHome.data
    const files = quality === 'low' ? chapter.dataSaver : chapter.data
    return files.map((filename) =>
      buildPageProxyUrl(baseUrl, chapter.hash, filename, quality),
    )
  }, [atHome.data, quality])

  return { pages, isLoading: atHome.isLoading, isError: atHome.isError }
}
