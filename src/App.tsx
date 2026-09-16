import { useEffect, useState } from 'react'
import { loadTheme } from './features/settings/theme'
import HomeScreen from './features/discovery/HomeScreen'
import SearchScreen from './features/discovery/SearchScreen'
import LibraryScreen from './features/library/LibraryScreen'
import LocalFilesScreen from './features/localfiles/LocalFilesScreen'
import ProfileScreen from './features/sync/ProfileScreen'
import ReaderShell from './features/reader/ReaderShell'
import type { SeriesType } from './lib/db/schema'

type Tab = 'home' | 'search' | 'library' | 'local' | 'profile'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'search', label: 'Search', icon: '🔍' },
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'local', label: 'Local', icon: '📁' },
  { id: 'profile', label: 'Profile', icon: '👤' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [reading, setReading] = useState<{ id: string; type: SeriesType } | null>(null)

  useEffect(() => {
    void loadTheme()
  }, [])

  // Series type is refined from MangaDex tags in Phase 5; default manga for reader mode now.
  const openSeries = (id: string) => setReading({ id, type: 'manga' })

  if (reading) {
    return (
      <div className="h-screen">
        <ReaderShell
          seriesId={reading.id}
          seriesType={reading.type}
          onClose={() => setReading(null)}
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <main className="flex-1 overflow-y-auto">
        {tab === 'home' && <HomeScreen onOpen={openSeries} />}
        {tab === 'search' && <SearchScreen onOpen={openSeries} />}
        {tab === 'library' && <LibraryScreen onOpen={openSeries} />}
        {tab === 'local' && <LocalFilesScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </main>

      <nav className="flex border-t border-neutral-800 bg-neutral-950">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              tab === t.id ? 'text-violet-400' : 'text-neutral-500'
            }`}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
