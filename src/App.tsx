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
  const [overlay, setOverlay] = useState<OverlayScreen | null>(null)
  const [onboarding, setOnboarding] = useState<boolean | null>(null)

  useEffect(() => {
    loadStoredTheme()
    hasSeenOnboarding().then(seen => setOnboarding(!seen))
  }, [])

  function goBack() {
    if (!overlay) return
    setOverlay(null)
  }

  function openSeries(id: string, source: SeriesSource = 'kakalot') {
    setOverlay({ kind: 'detail', id, source })
  }

  function openReader(id: string, source: SeriesSource, type: SeriesType = 'manga', startChapterId?: string) {
    void markReadingIfWanted(id) // Want to Read → Reading on first open
    setOverlay({ kind: 'reader', id, source, type, startChapterId })
  }

  function switchTab(t: Tab) {
    if (t === tab && !overlay) return
    prevTabRef.current = tab
    setOverlay(null)
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
