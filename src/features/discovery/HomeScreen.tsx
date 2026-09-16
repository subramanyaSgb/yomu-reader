// Home / discovery (FR-21): Continue Reading, Popular, Latest Updates, Recommended.
// Recommended-by-genre is derived in Phase 5 (needs stats); shown as Popular fallback now.

import { usePopular, useLatestUpdates, type MDManga } from '../../lib/mangadex/queries'
import SeriesCard from './SeriesCard'

function Row({
  title,
  items,
  loading,
  onOpen,
}: {
  title: string
  items: MDManga[]
  loading: boolean
  onOpen: (id: string) => void
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-4 text-sm font-semibold text-neutral-300">{title}</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1">
        {loading && <div className="text-xs text-neutral-500">Loading…</div>}
        {items.map((m) => (
          <SeriesCard key={m.id} manga={m} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

export default function HomeScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const popular = usePopular()
  const latest = useLatestUpdates()

  return (
    <div className="pb-20 pt-4">
      <h1 className="mb-4 px-4 text-2xl font-bold text-white">Yomu</h1>
      <Row
        title="Popular"
        items={popular.data?.data ?? []}
        loading={popular.isLoading}
        onOpen={onOpen}
      />
      <Row
        title="Latest Updates"
        items={latest.data?.data ?? []}
        loading={latest.isLoading}
        onOpen={onOpen}
      />
    </div>
  )
}
