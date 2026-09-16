import type { MDManga } from '../../lib/mangadex/queries'
import type { SeriesSource } from '../../App'

export function mangaTitle(m: MDManga): string {
  return m.attributes.title.en ?? Object.values(m.attributes.title)[0] ?? 'Untitled'
}

export default function SeriesCard({
  manga,
  onOpen,
}: {
  manga: MDManga
  onOpen: (id: string, source: SeriesSource) => void
}) {
  return (
    <button onClick={() => onOpen(manga.id, 'mangadex')} className="w-28 shrink-0 text-left">
      <div className="mb-1 flex h-40 w-28 items-center justify-center rounded-lg bg-neutral-800 text-xs text-neutral-500">
        cover
      </div>
      <div className="line-clamp-2 text-xs text-neutral-200">{mangaTitle(manga)}</div>
    </button>
  )
}
