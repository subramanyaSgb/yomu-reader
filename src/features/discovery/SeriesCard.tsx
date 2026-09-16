import { mangaCoverUrl, mangaEnTitle } from '../../lib/mangadex/queries'
import type { MDManga } from '../../lib/mangadex/queries'
import type { SeriesSource } from '../../App'

const PROXY_BASE =
  (import.meta.env?.VITE_IMAGE_PROXY as string | undefined) ?? 'http://localhost:8787'

function proxyCover(coverUrl: string): string {
  const u = new URL('/img', PROXY_BASE)
  u.searchParams.set('u', coverUrl)
  return u.toString()
}

// Keep old export for any callers not yet updated
export function mangaTitle(m: MDManga): string { return mangaEnTitle(m) }

export default function SeriesCard({
  manga,
  onOpen,
}: {
  manga: MDManga
  onOpen: (id: string, source: SeriesSource) => void
}) {
  const rawCover = mangaCoverUrl(manga)
  const cover = rawCover ? proxyCover(rawCover) : null
  const title = mangaEnTitle(manga)

  return (
    <button onClick={() => onOpen(manga.id, 'mangadex')} className="w-28 shrink-0 text-left">
      <div className="mb-1 h-40 w-28 overflow-hidden rounded-lg bg-neutral-800">
        {cover ? (
          <img src={cover} alt={title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-500">cover</div>
        )}
      </div>
      <div className="line-clamp-2 text-xs text-neutral-200">{title}</div>
    </button>
  )
}
