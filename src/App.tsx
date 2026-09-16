import { useState } from 'react'
import { useSearch } from './lib/mangadex/queries'
import ReaderShell from './features/reader/ReaderShell'
import type { SeriesType } from './lib/db/schema'

// Phase 1 host: a minimal picker -> real reader. Full discovery/library is Phase 3.
function mdTypeToSeriesType(): SeriesType {
  // MangaDex tags carry demographic/format; refined in Phase 3. Default manga for now.
  return 'manga'
}

export default function App() {
  const [term, setTerm] = useState('')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<{ id: string; type: SeriesType } | null>(null)
  const search = useSearch(query)

  if (open) {
    return (
      <div className="h-screen">
        <ReaderShell
          seriesId={open.id}
          seriesType={open.type}
          onClose={() => setOpen(null)}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="mb-3 text-2xl font-bold text-white">Yomu</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setQuery(term)
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search a series…"
          className="flex-1 rounded-lg bg-neutral-800 px-3 py-2 text-white outline-none"
        />
        <button className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white">Go</button>
      </form>
      {search.isLoading && <p className="text-neutral-400">Searching…</p>}
      {search.data?.data.map((m) => (
        <button
          key={m.id}
          onClick={() => setOpen({ id: m.id, type: mdTypeToSeriesType() })}
          className="mb-2 block w-full rounded-lg bg-neutral-800 px-3 py-2 text-left text-white hover:bg-neutral-700"
        >
          {m.attributes.title.en ?? Object.values(m.attributes.title)[0]}
        </button>
      ))}
    </div>
  )
}
