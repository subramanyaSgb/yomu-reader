import { mangaCoverUrl, mangaEnTitle } from '../../lib/mangadex/queries'
import type { MDManga } from '../../lib/mangadex/queries'
import type { SeriesSource } from '../../App'

export function mangaTitle(m: MDManga): string { return mangaEnTitle(m) }

export default function SeriesCard({
  manga,
  onOpen,
}: {
  manga: MDManga
  onOpen: (id: string, source: SeriesSource) => void
}) {
  const cover = mangaCoverUrl(manga) // uploads.mangadex.org has CORS — no proxy needed
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
