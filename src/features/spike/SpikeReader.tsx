// Phase 0 spike: prove the full path in a real browser —
// search -> series -> English chapters -> render pages THROUGH the proxy helper.
// Deliberately ugly; this is a risk-proof, not the real reader (that's Phase 1).

import { useState } from 'react'
import { useSearch, useChapterFeed, useAtHomeServer } from '../../lib/mangadex/queries'
import { buildPageProxyUrl } from '../../lib/proxy/imageUrl'

function title(t: Record<string, string>) {
  return t.en ?? Object.values(t)[0] ?? 'Untitled'
}

export default function SpikeReader() {
  const [term, setTerm] = useState('')
  const [query, setQuery] = useState('')
  const [mangaId, setMangaId] = useState<string>()
  const [chapterId, setChapterId] = useState<string>()

  const search = useSearch(query)
  const feed = useChapterFeed(mangaId)
  const atHome = useAtHomeServer(chapterId)

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="mb-3 text-2xl font-bold text-white">Yomu — Phase 0 spike</h1>

      {/* 1. Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setMangaId(undefined)
          setChapterId(undefined)
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
        <button className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white">
          Go
        </button>
      </form>

      {/* 2. Series results */}
      {search.isLoading && <p className="text-neutral-400">Searching…</p>}
      {search.isError && <p className="text-red-400">Search failed.</p>}
      {!mangaId &&
        search.data?.data.map((m) => (
          <button
            key={m.id}
            onClick={() => setMangaId(m.id)}
            className="mb-2 block w-full rounded-lg bg-neutral-800 px-3 py-2 text-left text-white hover:bg-neutral-700"
          >
            {title(m.attributes.title)}
          </button>
        ))}

      {/* 3. English chapters */}
      {mangaId && !chapterId && (
        <>
          <button onClick={() => setMangaId(undefined)} className="mb-2 text-sm text-violet-400">
            ← back to results
          </button>
          {feed.isLoading && <p className="text-neutral-400">Loading chapters…</p>}
          {feed.data?.data.length === 0 && (
            <p className="text-neutral-400">No English chapters.</p>
          )}
          {feed.data?.data
            .filter((c) => (c.attributes.pages ?? 0) > 0)
            .map((c) => (
              <button
                key={c.id}
                onClick={() => setChapterId(c.id)}
                className="mb-1 block w-full rounded bg-neutral-800 px-3 py-2 text-left text-sm text-white hover:bg-neutral-700"
              >
                Ch. {c.attributes.chapter ?? '?'} — {c.attributes.title || 'untitled'} (
                {c.attributes.pages}p)
              </button>
            ))}
        </>
      )}

      {/* 4. Render pages THROUGH THE PROXY — the exit criterion */}
      {chapterId && (
        <>
          <button onClick={() => setChapterId(undefined)} className="mb-2 text-sm text-violet-400">
            ← back to chapters
          </button>
          {atHome.isLoading && <p className="text-neutral-400">Fetching image server…</p>}
          {atHome.isError && <p className="text-red-400">at-home failed.</p>}
          {atHome.data && (
            <div className="flex flex-col gap-1">
              {atHome.data.chapter.data.map((filename) => {
                const src = buildPageProxyUrl(
                  atHome.data!.baseUrl,
                  atHome.data!.chapter.hash,
                  filename,
                  'source',
                )
                return <img key={filename} src={src} alt="" loading="lazy" className="w-full" />
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
