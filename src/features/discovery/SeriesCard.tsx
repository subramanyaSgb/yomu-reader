// Compact series card for discovery rows + grids.
import type { MDManga } from '../../lib/mangadex/queries'

export function mangaTitle(m: MDManga): string {
  return m.attributes.title.en ?? Object.values(m.attributes.title)[0] ?? 'Untitled'
}

export default function SeriesCard({
  manga,
  onOpen,
}: {
  manga: MDManga
  onOpen: (id: string) => void
}) {
  return (
    <button
      onClick={() => onOpen(manga.id)}
      className="w-28 shrink-0 text-left"
    >
      <div className="mb-1 flex h-40 w-28 items-center justify-center rounded-lg bg-neutral-800 text-xs text-neutral-500">
        {/* Cover art wiring (cover_art relationship -> proxy) is a Phase 5 polish item. */}
        cover
      </div>
      <div className="line-clamp-2 text-xs text-neutral-200">{mangaTitle(manga)}</div>
    </button>
  )
}
