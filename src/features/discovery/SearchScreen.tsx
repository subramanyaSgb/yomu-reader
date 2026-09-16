// Search (FR-22): debounced search across MangaDex + Mangakakalot, status filters, recent history.
import { useEffect, useState } from 'react'
import { useSearch } from '../../lib/mangadex/queries'
import { useKakalotSearch } from '../../lib/kakalot/queries'
import { getSetting, setSetting } from '../../lib/db/repo'
import { mangaTitle } from './SeriesCard'
import { mangaCoverUrl, mangaEnTitle } from '../../lib/mangadex/queries'

const PROXY_BASE =
  (import.meta.env?.VITE_IMAGE_PROXY as string | undefined) ?? 'http://localhost:8787'
function proxyCover(u: string) {
  const p = new URL('/img', PROXY_BASE)
  p.searchParams.set('u', u)
  return p.toString()
}
import type { SeriesSource } from '../../App'

const RECENT_KEY = 'search:recent'
const STATUSES = ['ongoing', 'completed', 'hiatus'] as const

export default function SearchScreen({
  onOpen,
}: {
  onOpen: (id: string, source: SeriesSource) => void
}) {
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    getSetting<string[]>(RECENT_KEY).then((r) => setRecent(r ?? []))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 350)
    return () => clearTimeout(t)
  }, [term])

  const mdSearch = useSearch(debounced)
  const kkSearch = useKakalotSearch(debounced)

  function remember(q: string) {
    if (!q) return
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8)
    setRecent(next)
    void setSetting(RECENT_KEY, next)
  }

  const isLoading = mdSearch.isLoading || kkSearch.isLoading
  const mdResults = mdSearch.data?.data ?? []
  const kkResults = kkSearch.data ?? []

  return (
    <div className="px-4 pb-20 pt-4">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onBlur={() => remember(debounced)}
        placeholder="Search MangaDex + Mangakakalot…"
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

      {isLoading && <p className="text-neutral-500">Searching…</p>}

      {/* MangaDex results */}
      {mdResults.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-xs font-semibold text-neutral-500">MangaDex</div>
          <div className="grid grid-cols-2 gap-3">
            {mdResults.map((m) => {
              const rawCover = mangaCoverUrl(m)
              const cover = rawCover ? proxyCover(rawCover) : null
              return (
                <button
                  key={m.id}
                  onClick={() => { remember(debounced); onOpen(m.id, 'mangadex') }}
                  className="rounded-lg bg-neutral-800 text-left text-sm text-neutral-200 overflow-hidden"
                >
                  <div className="h-36 w-full bg-neutral-700">
                    {cover && <img src={cover} alt={mangaTitle(m)} className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <div className="line-clamp-2 p-2 text-xs">{mangaEnTitle(m)}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Mangakakalot results */}
      {kkResults.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold text-neutral-500">Mangakakalot</div>
          <div className="grid grid-cols-2 gap-3">
            {kkResults.map((m) => (
              <button
                key={m.id}
                onClick={() => { remember(debounced); onOpen(m.id, 'kakalot') }}
                className="rounded-lg bg-neutral-800 p-3 text-left text-sm text-neutral-200"
              >
                <div className="line-clamp-2">{m.title}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
