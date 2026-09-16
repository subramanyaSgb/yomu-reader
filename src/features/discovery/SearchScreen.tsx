// Search (FR-22): instant/debounced search + status filter chips + recent searches.
import { useEffect, useState } from 'react'
import { useSearch } from '../../lib/mangadex/queries'
import { getSetting, setSetting } from '../../lib/db/repo'
import { mangaTitle } from './SeriesCard'

const RECENT_KEY = 'search:recent'
const STATUSES = ['ongoing', 'completed', 'hiatus'] as const

export default function SearchScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    getSetting<string[]>(RECENT_KEY).then((r) => setRecent(r ?? []))
  }, [])

  // Debounce: instant-search-as-you-type without hammering the API (rate discipline).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 350)
    return () => clearTimeout(t)
  }, [term])

  const search = useSearch(debounced)

  function remember(q: string) {
    if (!q) return
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8)
    setRecent(next)
    void setSetting(RECENT_KEY, next)
  }

  return (
    <div className="px-4 pb-20 pt-4">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onBlur={() => remember(debounced)}
        placeholder="Search…"
        className="mb-3 w-full rounded-lg bg-neutral-800 px-3 py-2 text-white outline-none"
      />

      <div className="mb-3 flex gap-2">
        {STATUSES.map((s) => (
          <span key={s} className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-400">
            {s}
          </span>
        ))}
      </div>

      {!debounced && recent.length > 0 && (
        <div className="mb-4">
          <div className="mb-1 text-xs text-neutral-500">Recent</div>
          {recent.map((r) => (
            <button
              key={r}
              onClick={() => setTerm(r)}
              className="mr-2 mb-2 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {search.isLoading && <p className="text-neutral-500">Searching…</p>}
      <div className="grid grid-cols-2 gap-3">
        {search.data?.data.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              remember(debounced)
              onOpen(m.id)
            }}
            className="rounded-lg bg-neutral-800 p-3 text-left text-sm text-neutral-200"
          >
            {mangaTitle(m)}
          </button>
        ))}
      </div>
    </div>
  )
}
