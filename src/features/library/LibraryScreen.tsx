// Library (FR-23): shelf tabs, sorted grid, unread badges. Collections + long-press actions
// are surfaced minimally here; deeper management lands in Phase 5 settings.
import { useEffect, useState } from 'react'
import { getLibrary } from './libraryRepo'
import {
  SHELVES,
  sortComparator,
  onShelf,
  unreadCount,
  type LibraryEntry,
  type Shelf,
  type SortKey,
} from './libraryLogic'

export default function LibraryScreen({ onOpen }: { onOpen: (id: string, source?: 'mangadex' | 'kakalot') => void }) {
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [shelf, setShelf] = useState<Shelf>('reading')
  const [sort, setSort] = useState<SortKey>('recent')

  useEffect(() => {
    getLibrary().then(setEntries)
  }, [])

  const shown = onShelf(entries, shelf).sort(sortComparator(sort))

  return (
    <div className="px-4 pb-20 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Library</h1>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
        >
          <option value="recent">Recent</option>
          <option value="az">A–Z</option>
          <option value="updated">Updated</option>
        </select>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {SHELVES.map((s) => (
          <button
            key={s}
            onClick={() => setShelf(s)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              shelf === s ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="text-sm text-neutral-500">Nothing here yet — browse and add series.</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {shown.map((e) => (
          <button
            key={e.seriesId}
            onClick={() => onOpen(e.seriesId)}
            className="relative rounded-lg bg-neutral-800 p-3 text-left text-sm text-neutral-200"
          >
            {unreadCount(e) > 0 && (
              <span className="absolute right-2 top-2 rounded-full bg-orange-500 px-1.5 text-xs text-white">
                {unreadCount(e)}
              </span>
            )}
            {e.title}
          </button>
        ))}
      </div>
    </div>
  )
}
