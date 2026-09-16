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
import ShelfScreen from './features/shelf/ShelfScreen'
import SeriesDetail from './features/discovery/SeriesDetail'
import ReaderShell from './features/reader/ReaderShell'
import { markReadingIfWanted, type Shelf } from './features/shelf/shelf'
import type { SeriesType } from './lib/db/schema'

export type Tab = Shelf
export type SeriesSource = 'mangadex' | 'kakalot' | 'comick'

type OverlayScreen =
  | { kind: 'detail'; id: string; source: SeriesSource }
  | { kind: 'reader'; id: string; source: SeriesSource; type: SeriesType; startChapterId?: string }

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
    hasSeenOnboarding().then(seen => setOnboarding(!seen))
  }, [])

  // Bumped when a reader closes so the detail page below remounts with fresh
  // progress + read markers.
  const [detailRefresh, setDetailRefresh] = useState(0)

  useEffect(() => {
    const onPop = () => {
      if (stackRef.current[stackRef.current.length - 1]?.kind === 'reader') {
        setDetailRefresh(n => n + 1)
      }
      setStack(s => s.slice(0, -1))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function pushOverlay(o: OverlayScreen) {
    history.pushState({ yomu: stackRef.current.length + 1 }, '')
    setStack(s => [...s, o])
  }

  function goBack() {
    if (stackRef.current.length === 0) return
    history.back() // popstate handler pops the stack
  }

  function openSeries(id: string, source: SeriesSource = 'kakalot') {
    pushOverlay({ kind: 'detail', id, source })
  }

  function openReader(id: string, source: SeriesSource, type: SeriesType = 'manga', startChapterId?: string) {
    void markReadingIfWanted(id) // Want to Read → Reading on first open
    pushOverlay({ kind: 'reader', id, source, type, startChapterId })
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
  }

  if (onboarding === null) return null
  if (onboarding) return <OnboardingScreen onDone={() => setOnboarding(false)} />

  // Reader is fully immersive — no BottomNav, no banner
  if (overlay?.kind === 'reader') {
    return (
      <ToastProvider>
        <div style={{ height: '100dvh', background: 'var(--y-black)' }}>
          <ReaderShell
            seriesId={overlay.id}
            seriesSource={overlay.source}
            seriesType={overlay.type}
            startChapterId={overlay.startChapterId}
            onClose={goBack}
          />
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
              onRead={(readId, readSource, startChapterId) =>
                openReader(readId ?? overlay.id, readSource ?? overlay.source, 'manga', startChapterId)}
            />
          )}
          {!overlay && <ShelfScreen shelf={tab} onOpen={openSeries} />}
        </main>

        {!overlay && (
          <BottomNav active={tab} onTab={switchTab} />
        )}
      </div>
    </ToastProvider>
  )
}
