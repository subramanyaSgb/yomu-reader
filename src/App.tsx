// App shell: three shelves (Reading / Want to Read / Completed) over the curated
// catalog, plus the series-detail and reader overlays. Nothing else — this is a
// personal tracker+reader. New series are appended to src/catalog.ts on request
// and land on the Want to Read shelf.

import { useEffect, useRef, useState } from 'react'
import { loadStoredTheme } from './styles/theme'
import { ToastProvider } from './components/Toast'
import BottomNav from './components/BottomNav'
import OfflineBanner from './features/reliability/OfflineBanner'
import OnboardingScreen from './features/onboarding/OnboardingScreen'
import { hasSeenOnboarding } from './features/onboarding/Onboarding'
import { lazy, Suspense } from 'react'
import ShelfScreen from './features/shelf/ShelfScreen'
import UpcomingScreen from './features/shelf/UpcomingScreen'
import HistoryScreen from './features/history/HistoryScreen'
import StatsScreen from './features/history/StatsScreen'
import SeriesDetail from './features/discovery/SeriesDetail'
import type { Bookmark } from './features/bookmarks/bookmarks'
// The reader (renderers, zoom math, resume, HUD) is the heaviest screen and isn't
// needed to browse shelves — split it out of the startup bundle.
const ReaderShell = lazy(() => import('./features/reader/ReaderShell'))
import { markReadingIfWanted, type Shelf } from './features/shelf/shelf'
import { migrateChangedIds } from './features/shelf/idMigration'
import type { SeriesType } from './lib/db/schema'

export type Tab = Shelf
export type SeriesSource = 'mangadex' | 'kakalot' | 'comick'

type OverlayScreen =
  | { kind: 'detail'; id: string; source: SeriesSource }
  | { kind: 'reader'; id: string; source: SeriesSource; type: SeriesType; startChapterId?: string; startPosition?: Bookmark['position'] }
  | { kind: 'upcoming' }
  | { kind: 'history' }
  | { kind: 'stats' }

export default function App() {
  const [tab, setTab] = useState<Tab>('reading')
  const prevTabRef = useRef<Tab>('reading')
  // Overlay STACK backed by browser history: hardware/browser Back pops one overlay
  // (reader → detail → shelf) instead of exiting the PWA (the "back closes the app" bug).
  const [stack, setStack] = useState<OverlayScreen[]>([])
  const stackRef = useRef<OverlayScreen[]>([])
  stackRef.current = stack
  const overlay = stack.length > 0 ? stack[stack.length - 1] : null
  const [onboarding, setOnboarding] = useState<boolean | null>(null)

  useEffect(() => {
    loadStoredTheme()
    // Run source-id migration BEFORE any screen reads shelf/progress state.
    migrateChangedIds()
      .catch(() => { /* best effort */ })
      .then(() => hasSeenOnboarding())
      .then(seen => setOnboarding(!seen))
    // Refresh persistence: the overlay stack lives in history.state (reload restores
    // the exact screen); the tab lives in sessionStorage — NOT history.state, because
    // async history.go() during tab switches raced replaceState and reverted the tab.
    const savedTab = sessionStorage.getItem('yomu:tab') as Tab | null
    if (savedTab === 'reading' || savedTab === 'want' || savedTab === 'completed') setTab(savedTab)
    const hs = history.state as { stack?: OverlayScreen[] } | null
    if (hs?.stack?.length) setStack(hs.stack)
  }, [])

  // Bumped when a reader closes so the detail page below remounts with fresh
  // progress + read markers.
  const [detailRefresh, setDetailRefresh] = useState(0)

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      if (stackRef.current[stackRef.current.length - 1]?.kind === 'reader') {
        setDetailRefresh(n => n + 1)
      }
      const hs = e.state as { stack?: OverlayScreen[] } | null
      setStack(hs?.stack ?? [])
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function pushOverlay(o: OverlayScreen) {
    const next = [...stackRef.current, o]
    history.pushState({ stack: next }, '')
    setStack(next)
  }

  function goBack() {
    if (stackRef.current.length === 0) return
    history.back() // popstate handler pops the stack
  }

  function openSeries(id: string, source: SeriesSource = 'kakalot') {
    pushOverlay({ kind: 'detail', id, source })
  }

  function openReader(id: string, source: SeriesSource, type: SeriesType = 'manga', startChapterId?: string, startPosition?: Bookmark['position']) {
    void markReadingIfWanted(id) // Want to Read → Reading on first open
    pushOverlay({ kind: 'reader', id, source, type, startChapterId, startPosition })
  }

  function switchTab(t: Tab) {
    if (t === tab && !overlay) return
    prevTabRef.current = tab
    if (stackRef.current.length > 0) {
      // Drop the overlay history entries so Back on the shelf doesn't replay them.
      history.go(-stackRef.current.length)
    }
    setStack([])
    setTab(t)
    sessionStorage.setItem('yomu:tab', t)
  }

  if (onboarding === null) return null
  if (onboarding) return <OnboardingScreen onDone={() => setOnboarding(false)} />

  // Reader is fully immersive — no BottomNav, no banner
  if (overlay?.kind === 'reader') {
    return (
      <ToastProvider>
        <div style={{ height: '100dvh', background: 'var(--y-black)' }}>
          <Suspense fallback={<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>Opening reader…</div>}>
            <ReaderShell
              seriesId={overlay.id}
              seriesSource={overlay.source}
              seriesType={overlay.type}
              startChapterId={overlay.startChapterId}
              startPosition={overlay.startPosition}
              onClose={goBack}
            />
          </Suspense>
        </div>
      </ToastProvider>
    )
  }

  return (
    <ToastProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--y-bg)' }}>
        <OfflineBanner />

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {overlay?.kind === 'detail' && (
            <SeriesDetail
              key={`${overlay.id}:${detailRefresh}`}
              id={overlay.id}
              source={overlay.source}
              onBack={goBack}
              onRead={(readId, readSource, startChapterId, startPosition) =>
                openReader(readId ?? overlay.id, readSource ?? overlay.source, 'manga', startChapterId, startPosition)}
            />
          )}
          {overlay?.kind === 'upcoming' && (
            <UpcomingScreen onBack={goBack} onOpen={openSeries} />
          )}
          {overlay?.kind === 'history' && (
            <HistoryScreen onBack={goBack} onOpen={openSeries} />
          )}
          {overlay?.kind === 'stats' && (
            <StatsScreen onBack={goBack} />
          )}
          {!overlay && (
            <ShelfScreen
              shelf={tab}
              onOpen={openSeries}
              onUpcoming={() => pushOverlay({ kind: 'upcoming' })}
              onHistory={() => pushOverlay({ kind: 'history' })}
              onStats={() => pushOverlay({ kind: 'stats' })}
            />
          )}
        </main>

        {!overlay && (
          <BottomNav active={tab} onTab={switchTab} />
        )}
      </div>
    </ToastProvider>
  )
}
